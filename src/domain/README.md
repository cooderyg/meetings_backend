# Domain Layer

`src/domain` 디렉토리는 3계층 레이어드 아키텍처에서 비즈니스 로직을 담당하는 레이어입니다. MikroORM Custom Repository 패턴을 사용하여 데이터 접근을 추상화합니다.

## 📁 디렉토리 구조

```
src/domain/
├── user/                   # 사용자 도메인
│   ├── entity/                # 엔티티
│   │   └── user.entity.ts
│   ├── repository/            # 커스텀 레포지토리
│   │   └── user.repository.ts
│   ├── service/               # 비즈니스 서비스
│   │   └── user.service.ts
│   ├── dto/                   # 도메인 DTO
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── user.module.ts
├── auth/                   # 인증 도메인
│   ├── entity/
│   ├── repository/
│   ├── service/
│   └── auth.module.ts
├── payment/                # 결제 도메인
│   ├── entity/
│   ├── repository/
│   ├── service/
│   └── payment.module.ts
└── shared/                 # 공유 도메인 요소
    ├── repository/            # 베이스 레포지토리
    │   └── base.repository.ts
    └── dto/                   # 공통 DTO
```

## 🏗️ 3계층 아키텍처 원칙

### 1. 계층 분리
- **Presentation Layer**: 컨트롤러, DTO 변환
- **Business Layer**: 비즈니스 로직, 서비스
- **Data Access Layer**: 엔티티, 레포지토리

### 2. 의존성 방향
- 상위 계층이 하위 계층에 의존
- 인터페이스를 통한 추상화
- 비즈니스 로직의 독립성

## 🔍 도메인 구성 요소

### 엔티티 (Entity)

```typescript
// user/entity/user.entity.ts
@Entity()
@Repository(() => UserRepository)
export class User extends BaseEntity {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  userId!: string;
  
  @Property({ unique: true })
  email!: string;
  
  @Property()
  password!: string;
  
  @Property()
  name!: string;
  
  @Property({ nullable: true })
  deletedAt?: Date;
}
```

### MikroORM Custom Repository

```typescript
// user/repository/user.repository.ts
export class UserRepository extends EntityRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email, isDeleted: false });
  }
  
  async findActiveUsers(): Promise<User[]> {
    return this.find({ isActive: true, isDeleted: false });
  }
  
  async softDelete(userId: string): Promise<void> {
    await this.nativeUpdate({ userId }, { isDeleted: true, deletedAt: new Date() });
  }
}
```

### 비즈니스 서비스 (Business Service)

```typescript
// user/service/user.service.ts
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // 비즈니스 규칙: 이메일 중복 확인
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new AppException(ErrorCode.BUSINESS_USER_EMAIL_ALREADY_EXISTS);
    }
    
    const user = this.userRepository.create({
      email: createUserDto.email,
      password: await this.hashPassword(createUserDto.password),
      name: createUserDto.name,
    });
    
    this.userRepository.persist(user);
    await this.userRepository.flush();
    return user;
  }
  
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ userId, isDeleted: false });
    if (!user) {
      throw new AppException(ErrorCode.RESOURCE_USER_NOT_FOUND);
    }
    return user;
  }
  
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(userId);
    
    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }
    
    await this.userRepository.flush();
    return user;
  }
  
  async deleteUser(userId: string): Promise<void> {
    await this.userRepository.softDelete(userId);
  }
  
  // ... 기타 메서드
}
```

### DTO (Data Transfer Object)

```typescript
// user/dto/create-user.dto.ts
export class CreateUserDto {
  @IsEmail()
  email!: string;
  
  @IsString()
  @MinLength(8)
  password!: string;
  
  @IsString()
  @MaxLength(50)
  name!: string;
}
```

## 🔄 레이어 간 상호작용

### Presentation Layer (Controller)

```typescript
// src/presentation/user/user.controller.ts
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.createUser(createUserDto);
  }
  
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<User> {
    return this.userService.getUserById(id);
  }
  
  // ... 기타 메서드
}
```

### Business Layer ↔ Data Access Layer

```typescript
// 비즈니스 서비스에서 Custom Repository 직접 사용
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    // ...
  }
}
```

## 📦 모듈 구성

```typescript
// user/user.module.ts
@Module({
  imports: [
    MikroOrmModule.forFeature([User]) // Custom Repository 자동 등록
  ],
  providers: [
    UserService,
    // UserRepository는 @Repository 데코레이터로 자동 등록
  ],
  exports: [UserService],
})
export class UserModule {}

// app.module.ts
@Module({
  imports: [
    // Infrastructure
    DatabaseModule,
    
    // Domain
    UserModule,
    AuthModule,
    PaymentModule,
  ],
})
export class AppModule {}
```

## 🎯 모범 사례

### 1. persist + flush 패턴 활용
```typescript
// ✅ persist + flush 분리 패턴
export class UserService {
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    
    this.userRepository.persist(user);
    await this.userRepository.flush();
    return user;
  }
  
  async createMultipleUsers(users: CreateUserDto[]): Promise<User[]> {
    const createdUsers = users.map(dto => {
      const user = this.userRepository.create(dto);
      this.userRepository.persist(user);
      return user;
    });
    
    await this.userRepository.flush(); // 한 번에 모든 변경사항 저장
    return createdUsers;
  }
}
```

### 2. 비즈니스 로직 중앙화
```typescript
// ✅ 서비스 레이어에 비즈니스 규칙 집중
export class UserService {
  async promoteToVip(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    
    // 비즈니스 규칙 검증
    if (!this.canPromoteToVip(user)) {
      throw new AppException(ErrorCode.BUSINESS_VIP_REQUIREMENTS_NOT_MET);
    }
    
    user.isVip = true;
    await this.userRepository.flush();
    return user;
  }
}
```

### 3. Custom Repository 활용
```typescript
// ✅ 비즈니스 로직에 맞는 커스텀 메서드 추가
export class UserRepository extends EntityRepository<User> {
  async findActiveUsersByDomain(domain: string): Promise<User[]> {
    return this.find({
      email: { $like: `%@${domain}` },
      isActive: true,
      isDeleted: false
    });
  }
}
```

## 🚀 확장 패턴

### 트랜잭션 관리

```typescript
// 비즈니스 서비스에서 트랜잭션 처리
export class UserService {
  async transferUserData(fromUserId: string, toUserId: string): Promise<void> {
    await this.em.transactional(async (em) => {
      const fromUser = await em.findOneOrFail(User, { userId: fromUserId });
      const toUser = await em.findOneOrFail(User, { userId: toUserId });
      
      // 변경사항들
      fromUser.isActive = false;
      toUser.lastLoginAt = new Date();
      
      // 트랜잭션 내에서 자동 flush
    });
  }
}
```

### Unit of Work 패턴

```typescript
// 여러 엔티티 변경을 한 번에 처리
export class UserService {
  async updateUserProfile(userId: string, profileData: any): Promise<void> {
    const user = await this.userRepository.findOneOrFail({ userId });
    const profile = await this.profileRepository.findOneOrFail({ userId });
    
    // 여러 엔티티 수정
    user.name = profileData.name;
    profile.bio = profileData.bio;
    
    // 한 번에 모든 변경사항 저장
    await this.userRepository.flush();
  }
}
```

## 🔍 테스트 전략

### 서비스 레이어 테스트

```typescript
describe('UserService', () => {
  it('should create user with valid data', async () => {
    // Given
    const createUserDto = { email: 'test@example.com', password: 'Strong123!', name: 'Test' };
    mockRepository.findByEmail.mockResolvedValue(null);
    
    // When
    const result = await service.createUser(createUserDto);
    
    // Then
    expect(mockRepository.persist).toHaveBeenCalled();
    expect(mockRepository.flush).toHaveBeenCalled();
  });
});
```

이 도메인 레이어는 3계층 아키텍처를 통해 명확한 책임 분리와 MikroORM의 persist + flush 패턴을 활용한 효율적인 데이터 관리를 제공합니다.