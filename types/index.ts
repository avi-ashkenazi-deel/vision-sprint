import type { Project, User, Vote, Team, TeamMember, Submission, Reaction, AppState } from '@prisma/client'

export type ProjectType = 'MOONSHOT' | 'SMALL_FEATURE' | 'DELIGHT' | 'EFFICIENCY'
export type AppStage = 'RECEIVING_SUBMISSIONS' | 'EXECUTING_SPRINT' | 'SPRINT_OVER'
export type ReactionType = 'MEDAL' | 'HEART' | 'SHOCK' | 'PARTY'

export interface ProjectWithDetails extends Project {
  creator: User
  votes: (Vote & { user: User })[]
  teams: (Team & { 
    members: (TeamMember & { user: User })[]
    submission: Submission | null 
  })[]
  reactions: Reaction[]
  _count: {
    votes: number
    reactions: number
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
  MOONSHOT: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  SMALL_FEATURE: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  DELIGHT: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  EFFICIENCY: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  MEDAL: '🥇',
  HEART: '❤️',
  SHOCK: '😱',
  PARTY: '🎉',
}
