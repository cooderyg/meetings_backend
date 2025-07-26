import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { WorkspaceMemberService } from './workspace-member.service';
import { WorkspaceMemberRepository } from './workspace-member.repository';

@Module({
  imports: [MikroOrmModule.forFeature([WorkspaceMember])],
  providers: [WorkspaceMemberService, WorkspaceMemberRepository],
  exports: [WorkspaceMemberService, WorkspaceMemberRepository],
})
export class WorkspaceMemberModule {}