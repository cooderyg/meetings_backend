import { Module } from '@nestjs/common';
import { MeetingSummaryRepository } from './meeting-summary.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MeetingSummary } from './entity/meeting-summary.entity';

@Module({
  imports: [MikroOrmModule.forFeature([MeetingSummary])],
  providers: [MeetingSummaryRepository],
})
export class MeetingSummaryModule {}
