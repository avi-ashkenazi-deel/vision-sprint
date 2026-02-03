import type { 
  ProjectAttributes, 
  UserAttributes, 
  VoteAttributes, 
  TeamAttributes, 
  TeamMemberAttributes, 
  SubmissionAttributes, 
  ReactionAttributes, 
  AppStateAttributes, 
  ProjectJoinAttributes, 
  VisionAttributes, 
  VisionLikeAttributes 
} from '../models'

// Re-export types for backwards compatibility
export type Project = ProjectAttributes
export type User = UserAttributes
export type Vote = VoteAttributes
export type Team = TeamAttributes
export type TeamMember = TeamMemberAttributes
export type Submission = SubmissionAttributes
export type Reaction = ReactionAttributes
export type AppState = AppStateAttributes
export type ProjectJoin = ProjectJoinAttributes
export type Vision = VisionAttributes
export type VisionLike = VisionLikeAttributes

export type ProjectType = 'MOONSHOT' | 'SMALL_FEATURE' | 'DELIGHT' | 'EFFICIENCY'
export type AppStage = 'RECEIVING_SUBMISSIONS' | 'EXECUTING_SPRINT' | 'SPRINT_OVER'
export type ReactionType = 'MEDAL' | 'HEART' | 'SHOCK' | 'PARTY'
export type Discipline = 'DEV' | 'PRODUCT' | 'DATA' | 'DESIGNER'

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  DEV: 'Developer',
  PRODUCT: 'Product',
  DATA: 'Data',
  DESIGNER: 'Designer',
}

export const DISCIPLINE_COLORS: Record<Discipline, string> = {
  DEV: 'bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)]',
  PRODUCT: 'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)]',
  DATA: 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)]',
  DESIGNER: 'bg-[var(--badge-pink-bg)] text-[var(--badge-pink-text)]',
}

export interface ProjectWithDetails extends Project {
  creator: User
  votes: (Vote & { user: User })[]
  joins: (ProjectJoin & { user: User })[]
  teams: (Team & { 
    members: (TeamMember & { user: User })[]
    submission: Submission | null 
  })[]
  reactions: Reaction[]
  vision?: Vision | null
  _count: {
    votes: number
    reactions: number
    joins: number
  }
}

export interface VisionWithDetails extends Vision {
  createdBy: User
  likes: (VisionLike & { user: User })[]
  _count: {
    likes: number
    projects: number
  }
}

export interface TeamWithDetails extends Team {
  project: Project
  members: (TeamMember & { user: User })[]
  submission: Submission | null
}

export interface UserWithDetails extends User {
  projects: Project[]
  votes: Vote[]
  teamMembers: TeamMember[]
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  MOONSHOT: 'Moon Shot',
  SMALL_FEATURE: 'Small Feature',
  DELIGHT: 'Delight',
  EFFICIENCY: 'Efficiency Improvement',
}

export const PROJECT_TYPE_COLORS: Record<ProjectType, string> = {
  MOONSHOT: 'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)]',
  SMALL_FEATURE: 'bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)]',
  DELIGHT: 'bg-[var(--badge-pink-bg)] text-[var(--badge-pink-text)]',
  EFFICIENCY: 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]',
}

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  MEDAL: '🥇',
  HEART: '❤️',
  SHOCK: '😱',
  PARTY: '🎉',
}

// Vision areas for categorizing business visions
export const VISION_AREAS = [
  'Growth',
  'Retention',
  'Efficiency',
  'Customer Experience',
  'Product Innovation',
  'Revenue',
  'Operations',
  'Data & Analytics',
  'Platform',
  'Other',
] as const

export type VisionArea = typeof VISION_AREAS[number]

export const VISION_AREA_COLORS: Record<string, string> = {
  'Growth': 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]',
  'Retention': 'bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)]',
  'Efficiency': 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)]',
  'Customer Experience': 'bg-[var(--badge-pink-bg)] text-[var(--badge-pink-text)]',
  'Product Innovation': 'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)]',
  'Revenue': 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]',
  'Operations': 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)]',
  'Data & Analytics': 'bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)]',
  'Platform': 'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)]',
  'Other': 'bg-[var(--badge-gray-bg)] text-[var(--badge-gray-text)]',
}
