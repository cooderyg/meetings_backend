import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { AppException } from '../../shared/exception/app.exception';
import { ERROR_CODES } from '../../shared/const';
import { UpdateUserSettingsDto } from './dto/request/update-user-settings.dto';
import { UserSettings } from './entity/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async updateUserSettings(id: string, data: UpdateUserSettingsDto): Promise<UserSettings> {
    // 1. 사용자 찾기 없으면 예외 처리
    const user = await this.userRepository.findById(id);

    if (!user) throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);

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
