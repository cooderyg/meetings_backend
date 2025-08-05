import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleRepository } from './role.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Role } from './entity/role.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Role])],
  controllers: [],
  providers: [RoleService, RoleRepository],
  exports: [RoleService],
})
export class RoleModule {}
