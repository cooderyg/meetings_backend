import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NeedAuth } from '../../shared/decorator/need-auth.decorator';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { User } from '../user/entity/user.entity';
import { CreateSpaceDto } from './dto/request/create-space.dto';
import { Space } from './entity/space.entity';
import { SpaceService } from './space.service';

@ApiTags('Spaces')
@Controller('spaces')
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @NeedAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new space' })
  @ApiResponse({
    status: 201,
    description: 'The space has been successfully created.',
    type: Space,
  })
  async create(
    @Body() dto: CreateSpaceDto,
    @UserInfo() user: User
  ): Promise<Space> {
    return this.spaceService.create({
      ...dto,
      userId: user.id,
    });
  }
}
