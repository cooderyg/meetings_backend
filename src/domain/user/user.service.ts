import { EntityManager, Transactional } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AppError } from '../../shared/exception/app.error';
import { UpdateUserSettingsDto } from './dto/request/update-user-settings.dto';
import { User, UserSettings } from './entity/user.entity';
import { ICreateUser } from './interfaces/create-user.interface';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly em: EntityManager
  ) {}

  async getUserByUid(uid: string) {
    return this.userRepository.findByUid(uid);
  }

  async getUserById(id: string) {
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  @Transactional()
  async createUser(user: ICreateUser) {
    if (!user.uid) {
      throw new AppError('validation.form.failed', {
        fields: { uid: ['uid is required'] },
      });
    }
    const createdUser = this.em.assign(new User(), {
      ...user,
      passwordHash: user.passwordHash ?? '',
    });

    await this.em.persistAndFlush(createdUser);
    return createdUser;
  }

  /**
   * User 설정 업데이트 (조회 + 병합 + 업데이트 원자성 보장)
   * @Transactional 데코레이터가 자동으로 트랜잭션 관리 (begin/commit/rollback)
   */
  @Transactional()
  async updateUserSettings(
    id: string,
    data: UpdateUserSettingsDto
  ): Promise<UserSettings> {
    // 1. 사용자 찾기 없으면 예외 처리
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError('user.fetch.notFound');
    }

    // 2. DTO를 UserSettings 형태로 변환
    const updatedSettings = this.mapDtoToSettings(data, user.settings);
    user.settings = updatedSettings;

    await this.userRepository.updateUser(user);

    return user.settings;
  }

  // DTO의 부분 업데이트 데이터를 기존 설정과 병합
  private mapDtoToSettings(
    dto: UpdateUserSettingsDto,
    currentSettings: UserSettings
  ): UserSettings {
    return {
      theme: {
        mode: dto.themeMode ?? currentSettings.theme.mode,
      },
    };
  }
}
