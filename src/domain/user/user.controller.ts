import { Body, Controller, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserSettingsDto } from './dto/request/update-user-settings.dto';
import { UpdateUserSettingsResDto } from './dto/response/update-user-settings.res.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('settings')
  async updateUserSettings(
    @Body() data: UpdateUserSettingsDto
  ): Promise<UpdateUserSettingsResDto> {
    // TODO: Token 검증 후 User Id로 변경
    const id = 'fkjfghsdfkjghdfjkguuid';

    const updatedSettings = await this.userService.updateUserSettings(id, data);
    return { settings: updatedSettings };
  }
}
