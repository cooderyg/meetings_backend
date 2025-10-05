// MeetingParticipant 서비스 메인 메서드 예시
// core-service-builder 에이전트로 생성된 코드

import { Injectable } from '@nestjs/common';
import { CreateMeetingParticipantArgs } from './interface/args/create-meeting-participant.args';
import { MeetingParticipantRepository } from './meeting-participant.repository';
import { MeetingService } from '../meeting/meeting.service';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { AppError } from '../../shared/exception/app.error';
import { MeetingParticipant } from './entity/meeting-participant.entity';

@Injectable()
export class MeetingParticipantServiceMainMethods {
  constructor(
    private readonly repository: MeetingParticipantRepository,
    private readonly meetingService: MeetingService,
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {}

  // 메인 비즈니스 메서드 - 참여자 생성
  async createMeetingParticipant(args: CreateMeetingParticipantArgs): Promise<MeetingParticipant> {
    // 1. 헬퍼 메서드로 검증
    const validation = this.validateParticipantCreation(args);
    if (!validation.isValid) {
      throw new AppError('meetingParticipant.create.invalidData', validation.errors);
    }

    // 2. 회의 존재 확인
    const meeting = await this.meetingService.getMeetingById(args.meetingId, args.workspaceId);
    if (!meeting) {
      throw new AppError('meetingParticipant.create.meetingNotFound', { 
        meetingId: args.meetingId 
      });
    }

    // 3. 회의 참여 가능 여부 확인
    const canJoin = this.canJoinMeeting(meeting);
    if (!canJoin.isValid) {
      throw new AppError('meetingParticipant.create.cannotJoin', canJoin.errors);
    }

    // 4. 참여자 유형별 처리
    const participantType = this.getParticipantType(args);
    
    if (participantType === 'MEMBER') {
      return await this.createMemberParticipant(meeting, args);
    } else {
      return await this.createGuestParticipant(meeting, args);
    }
  }

  // 메인 비즈니스 메서드 - 참여자 삭제
  async deleteMeetingParticipant(id: string): Promise<void> {
    const participant = await this.repository.findById(id);
    
    if (!participant) {
      throw new AppError('meetingParticipant.delete.notFound', { participantId: id });
    }

    // 삭제 가능 여부 확인 (헬퍼 메서드)
    const canDelete = this.canDeleteParticipant(participant);
    if (!canDelete.allowed) {
      throw new AppError('meetingParticipant.delete.notAllowed', { 
        reason: canDelete.reason 
      });
    }

    await this.repository.delete(participant);
  }

  // 메인 비즈니스 메서드 - 참여자 역할 변경  
  async updateParticipantRole(
    id: string, 
    newRole: string
  ): Promise<MeetingParticipant> {
    const participant = await this.repository.findById(id);
    
    if (!participant) {
      throw new AppError('meetingParticipant.update.notFound', { participantId: id });
    }

    // 역할 변경 가능 여부 확인 (헬퍼 메서드)
    const canChangeRole = this.canChangeRole(participant, newRole);
    if (!canChangeRole.allowed) {
      throw new AppError('meetingParticipant.update.roleChangeNotAllowed', {
        currentRole: participant.role,
        targetRole: newRole,
        reason: canChangeRole.reason
      });
    }

    return await this.repository.updateEntity(participant, { role: newRole });
  }

  // 메인 비즈니스 메서드 - 회의별 참여자 조회
  async findParticipantsByMeeting(
    meetingId: string,
    workspaceId: string
  ): Promise<MeetingParticipant[]> {
    // 회의 존재 확인
    const meeting = await this.meetingService.getMeetingById(meetingId, workspaceId);
    if (!meeting) {
      throw new AppError('meetingParticipant.find.meetingNotFound', { 
        meetingId 
      });
    }

    return await this.repository.findByMeeting(meetingId);
  }

  // === Private 메인 메서드들 ===

  private async createMemberParticipant(
    meeting: Meeting, 
    args: CreateMeetingParticipantArgs
  ): Promise<MeetingParticipant> {
    // 워크스페이스 멤버 존재 확인
    const workspaceMember = await this.workspaceMemberService.findById(args.workspaceMemberId!);
    if (!workspaceMember) {
      throw new AppError('meetingParticipant.create.memberNotFound', {
        workspaceMemberId: args.workspaceMemberId
      });
    }

    // 중복 참여 확인 (헬퍼 메서드)
    const duplicateCheck = await this.checkDuplicateParticipation(
      args.meetingId, 
      args.workspaceMemberId!
    );
    
    if (duplicateCheck.isDuplicate) {
      throw new AppError('meetingParticipant.create.duplicate', {
        reason: duplicateCheck.reason
      });
    }

    // 참여자 데이터 구성 (헬퍼 메서드)
    const participantData = this.buildMemberParticipantData(meeting, workspaceMember);
    
    return await this.repository.create(participantData);
  }

  private async createGuestParticipant(
    meeting: Meeting,
    args: CreateMeetingParticipantArgs  
  ): Promise<MeetingParticipant> {
    // 게스트명 중복 확인 (헬퍼 메서드)
    const duplicateCheck = await this.checkDuplicateGuestName(
      args.meetingId,
      args.guestName!
    );
    
    if (duplicateCheck.isDuplicate) {
      throw new AppError('meetingParticipant.create.duplicateGuest', {
        guestName: args.guestName,
        reason: duplicateCheck.reason
      });
    }

    // 게스트 참여자 데이터 구성 (헬퍼 메서드)
    const participantData = this.buildGuestParticipantData(meeting, args.guestName!);
    
    return await this.repository.create(participantData);
  }

  // === 여기서 헬퍼 메서드들이 호출됨 ===
  // (helper-method-builder가 생성한 메서드들을 여기에 포함)
  
  private validateParticipantCreation(args: CreateMeetingParticipantArgs): ValidationResult {
    // helper-method-builder에서 생성
    // ... 구현 생략 (위 예시 파일 참조)
  }

  private canJoinMeeting(meeting: Meeting): ValidationResult {
    // helper-method-builder에서 생성  
    // ... 구현 생략
  }

  private getParticipantType(args: CreateMeetingParticipantArgs): 'MEMBER' | 'GUEST' {
    // helper-method-builder에서 생성
    // ... 구현 생략  
  }

  // 기타 헬퍼 메서드들...
}