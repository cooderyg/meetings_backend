// MeetingParticipant 서비스 헬퍼 메서드 예시
// helper-method-builder 에이전트로 생성된 코드

import { CreateMeetingParticipantArgs } from './interface/args/create-meeting-participant.args';
import { Meeting } from '../meeting/entity/meeting.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { CreateMeetingParticipantData } from './interface/data/create-meeting-participant.data';

// 결과 인터페이스들
interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
  data?: any;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
}

// 헬퍼 메서드들 - MeetingParticipantService에 추가
export class MeetingParticipantServiceHelpers {
  
  // 1. 참여자 생성 데이터 검증
  private validateParticipantCreation(args: CreateMeetingParticipantArgs): ValidationResult {
    const errors: Record<string, string> = {};
    
    // 기본 필수 필드 검증
    if (!args.meetingId) {
      errors.meetingId = 'Meeting ID is required';
    }
    
    if (!args.workspaceId) {
      errors.workspaceId = 'Workspace ID is required';
    }
    
    // 참여자 타입 검증 (멤버 또는 게스트 중 하나는 있어야 함)
    if (!args.workspaceMemberId && !args.guestName) {
      errors.participant = 'Either workspace member or guest name is required';
    }
    
    // 둘 다 제공된 경우 (비즈니스 규칙 위반)
    if (args.workspaceMemberId && args.guestName) {
      errors.participant = 'Cannot specify both workspace member and guest name';
    }
    
    // 게스트명 유효성 검증
    if (args.guestName) {
      const trimmedName = args.guestName.trim();
      if (trimmedName.length === 0) {
        errors.guestName = 'Guest name cannot be empty';
      } else if (trimmedName.length > 100) {
        errors.guestName = 'Guest name must be less than 100 characters';
      }
    }
    
    const isValid = Object.keys(errors).length === 0;
    
    return {
      isValid,
      errors: isValid ? undefined : errors,
      data: isValid ? this.sanitizeParticipantArgs(args) : undefined
    };
  }
  
  // 2. 중복 참여 확인 (WorkspaceMember용)
  private async checkDuplicateParticipation(
    meetingId: string, 
    workspaceMemberId: string
  ): Promise<DuplicateCheckResult> {
    const existing = await this.findByMeetingAndMember(meetingId, workspaceMemberId);
    
    if (existing) {
      return {
        isDuplicate: true,
        reason: 'Workspace member is already a participant in this meeting'
      };
    }
    
    return { isDuplicate: false };
  }
  
  // 3. 게스트 중복 확인 (Guest용) 
  private async checkDuplicateGuestName(
    meetingId: string,
    guestName: string
  ): Promise<DuplicateCheckResult> {
    // Repository에 findByMeetingAndGuestName 메서드가 필요
    const existing = await this.repository.findByMeetingAndGuestName(meetingId, guestName.trim());
    
    if (existing) {
      return {
        isDuplicate: true,
        reason: 'Guest with this name is already a participant'
      };
    }
    
    return { isDuplicate: false };
  }
  
  // 4. 참여자 권한 확인
  private canJoinMeeting(meeting: Meeting): ValidationResult {
    const errors: Record<string, string> = {};
    
    // 회의 상태 확인
    if (meeting.status === 'COMPLETED') {
      errors.status = 'Cannot join completed meeting';
    }
    
    if (meeting.status === 'CANCELLED') {
      errors.status = 'Cannot join cancelled meeting';
    }
    
    // 최대 참여자 수 확인 (비즈니스 규칙이 있다면)
    const maxParticipants = 50; // 설정값
    if (meeting.participants && meeting.participants.length >= maxParticipants) {
      errors.capacity = `Meeting has reached maximum capacity of ${maxParticipants} participants`;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }
  
  // 5. 참여자 데이터 구성 (WorkspaceMember용)
  private buildMemberParticipantData(
    meeting: Meeting, 
    workspaceMember: WorkspaceMember
  ): CreateMeetingParticipantData {
    return {
      meeting,
      workspaceMember,
      guestName: null,
      joinedAt: new Date(),
      role: 'PARTICIPANT' // 기본 역할
    };
  }
  
  // 6. 참여자 데이터 구성 (Guest용)
  private buildGuestParticipantData(
    meeting: Meeting,
    guestName: string
  ): CreateMeetingParticipantData {
    return {
      meeting,
      workspaceMember: null,
      guestName: guestName.trim(),
      joinedAt: new Date(),
      role: 'GUEST'
    };
  }
  
  // 7. 데이터 정제
  private sanitizeParticipantArgs(args: CreateMeetingParticipantArgs): CreateMeetingParticipantArgs {
    return {
      ...args,
      guestName: args.guestName?.trim() || undefined
    };
  }
  
  // 8. 참여자 유형 판단
  private getParticipantType(args: CreateMeetingParticipantArgs): 'MEMBER' | 'GUEST' {
    return args.workspaceMemberId ? 'MEMBER' : 'GUEST';
  }
  
  // 9. 참여자 정보 요약 생성
  private buildParticipantSummary(args: CreateMeetingParticipantArgs): string {
    if (args.workspaceMemberId) {
      return `Workspace Member: ${args.workspaceMemberId}`;
    } else {
      return `Guest: ${args.guestName}`;
    }
  }
}