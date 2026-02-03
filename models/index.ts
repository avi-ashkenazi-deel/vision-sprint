import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import sequelize from '../lib/db'

// Enums
export enum Discipline {
  DEV = 'DEV',
  PRODUCT = 'PRODUCT',
  DATA = 'DATA',
  DESIGNER = 'DESIGNER'
}

export enum ProjectType {
  MOONSHOT = 'MOONSHOT',
  SMALL_FEATURE = 'SMALL_FEATURE',
  DELIGHT = 'DELIGHT',
  EFFICIENCY = 'EFFICIENCY'
}

export enum ReactionType {
  MEDAL = 'MEDAL',
  HEART = 'HEART',
  SHOCK = 'SHOCK',
  PARTY = 'PARTY'
}

export enum AppStage {
  RECEIVING_SUBMISSIONS = 'RECEIVING_SUBMISSIONS',
  EXECUTING_SPRINT = 'EXECUTING_SPRINT',
  SPRINT_OVER = 'SPRINT_OVER'
}

// ============================================
// User Model
// ============================================
export interface UserAttributes {
  id: string
  name: string | null
  email: string | null
  emailVerified: Date | null
  image: string | null
  isAdmin: boolean
  accessVerified: boolean
  discipline: Discipline | null
  createdAt?: Date
  updatedAt?: Date
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'name' | 'email' | 'emailVerified' | 'image' | 'isAdmin' | 'accessVerified' | 'discipline' | 'createdAt' | 'updatedAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string
  public name!: string | null
  public email!: string | null
  public emailVerified!: Date | null
  public image!: string | null
  public isAdmin!: boolean
  public accessVerified!: boolean
  public discipline!: Discipline | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public readonly accounts?: Account[]
  public readonly sessions?: Session[]
  public readonly projects?: Project[]
  public readonly votes?: Vote[]
  public readonly teamMembers?: TeamMember[]
  public readonly reactions?: Reaction[]
  public readonly watchedVideos?: WatchedVideo[]
  public readonly projectJoins?: ProjectJoin[]
  public readonly visions?: Vision[]
  public readonly visionLikes?: VisionLike[]
}

User.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  emailVerified: {
    type: DataTypes.DATE,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  accessVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  discipline: {
    type: DataTypes.ENUM(...Object.values(Discipline)),
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'User',
  modelName: 'User',
  timestamps: true
})

// ============================================
// Account Model (NextAuth)
// ============================================
export interface AccountAttributes {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string | null
  access_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string | null
  id_token: string | null
  session_state: string | null
}

interface AccountCreationAttributes extends Optional<AccountAttributes, 'id' | 'refresh_token' | 'access_token' | 'expires_at' | 'token_type' | 'scope' | 'id_token' | 'session_state'> {}

export class Account extends Model<AccountAttributes, AccountCreationAttributes> implements AccountAttributes {
  public id!: string
  public userId!: string
  public type!: string
  public provider!: string
  public providerAccountId!: string
  public refresh_token!: string | null
  public access_token!: string | null
  public expires_at!: number | null
  public token_type!: string | null
  public scope!: string | null
  public id_token!: string | null
  public session_state!: string | null

  public readonly user?: User
}

Account.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false
  },
  providerAccountId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  access_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  token_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  scope: {
    type: DataTypes.STRING,
    allowNull: true
  },
  id_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  session_state: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'Account',
  modelName: 'Account',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['provider', 'providerAccountId']
    }
  ]
})

// ============================================
// Session Model (NextAuth)
// ============================================
export interface SessionAttributes {
  id: string
  sessionToken: string
  userId: string
  expires: Date
}

interface SessionCreationAttributes extends Optional<SessionAttributes, 'id'> {}

export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: string
  public sessionToken!: string
  public userId!: string
  public expires!: Date

  public readonly user?: User
}

Session.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  sessionToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expires: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'Session',
  modelName: 'Session',
  timestamps: false
})

// ============================================
// VerificationToken Model (NextAuth)
// ============================================
export interface VerificationTokenAttributes {
  identifier: string
  token: string
  expires: Date
}

export class VerificationToken extends Model<VerificationTokenAttributes> implements VerificationTokenAttributes {
  public identifier!: string
  public token!: string
  public expires!: Date
}

VerificationToken.init({
  identifier: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  expires: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'VerificationToken',
  modelName: 'VerificationToken',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['identifier', 'token']
    }
  ]
})

// ============================================
// Project Model
// ============================================
export interface ProjectAttributes {
  id: string
  name: string
  description: string
  pitchVideoUrl: string | null
  docLink: string | null
  projectType: ProjectType
  slackChannel: string
  businessRationale: string | null
  visionId: string | null
  department: string | null
  creatorId: string
  createdAt?: Date
  updatedAt?: Date
}

interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'pitchVideoUrl' | 'docLink' | 'businessRationale' | 'visionId' | 'department' | 'createdAt' | 'updatedAt'> {}

export class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: string
  public name!: string
  public description!: string
  public pitchVideoUrl!: string | null
  public docLink!: string | null
  public projectType!: ProjectType
  public slackChannel!: string
  public businessRationale!: string | null
  public visionId!: string | null
  public department!: string | null
  public creatorId!: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  public readonly creator?: User
  public readonly vision?: Vision
  public readonly votes?: Vote[]
  public readonly teams?: Team[]
  public readonly reactions?: Reaction[]
  public readonly joins?: ProjectJoin[]
}

Project.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  pitchVideoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  docLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  projectType: {
    type: DataTypes.ENUM(...Object.values(ProjectType)),
    allowNull: false
  },
  slackChannel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  businessRationale: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  visionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  creatorId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'Project',
  modelName: 'Project',
  timestamps: true
})

// ============================================
// Vision Model
// ============================================
export interface VisionAttributes {
  id: string
  title: string
  description: string
  area: string
  docUrl: string | null
  kpis: string | null
  createdById: string
  createdAt?: Date
  updatedAt?: Date
}

interface VisionCreationAttributes extends Optional<VisionAttributes, 'id' | 'docUrl' | 'kpis' | 'createdAt' | 'updatedAt'> {}

export class Vision extends Model<VisionAttributes, VisionCreationAttributes> implements VisionAttributes {
  public id!: string
  public title!: string
  public description!: string
  public area!: string
  public docUrl!: string | null
  public kpis!: string | null
  public createdById!: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  public readonly createdBy?: User
  public readonly projects?: Project[]
  public readonly likes?: VisionLike[]
}

Vision.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  area: {
    type: DataTypes.STRING,
    allowNull: false
  },
  docUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  kpis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdById: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'Vision',
  modelName: 'Vision',
  timestamps: true
})

// ============================================
// VisionLike Model
// ============================================
export interface VisionLikeAttributes {
  id: string
  userId: string
  visionId: string
  createdAt?: Date
}

interface VisionLikeCreationAttributes extends Optional<VisionLikeAttributes, 'id' | 'createdAt'> {}

export class VisionLike extends Model<VisionLikeAttributes, VisionLikeCreationAttributes> implements VisionLikeAttributes {
  public id!: string
  public userId!: string
  public visionId!: string
  public readonly createdAt!: Date

  public readonly user?: User
  public readonly vision?: Vision
}

VisionLike.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  visionId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'VisionLike',
  modelName: 'VisionLike',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'visionId']
    }
  ]
})

// ============================================
// Vote Model
// ============================================
export interface VoteAttributes {
  id: string
  userId: string
  projectId: string
  createdAt?: Date
}

interface VoteCreationAttributes extends Optional<VoteAttributes, 'id' | 'createdAt'> {}

export class Vote extends Model<VoteAttributes, VoteCreationAttributes> implements VoteAttributes {
  public id!: string
  public userId!: string
  public projectId!: string
  public readonly createdAt!: Date

  public readonly user?: User
  public readonly project?: Project
}

Vote.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  projectId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'Vote',
  modelName: 'Vote',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'projectId']
    }
  ]
})

// ============================================
// ProjectJoin Model
// ============================================
export interface ProjectJoinAttributes {
  id: string
  userId: string
  projectId: string
  createdAt?: Date
}

interface ProjectJoinCreationAttributes extends Optional<ProjectJoinAttributes, 'id' | 'createdAt'> {}

export class ProjectJoin extends Model<ProjectJoinAttributes, ProjectJoinCreationAttributes> implements ProjectJoinAttributes {
  public id!: string
  public userId!: string
  public projectId!: string
  public readonly createdAt!: Date

  public readonly user?: User
  public readonly project?: Project
}

ProjectJoin.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  projectId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'ProjectJoin',
  modelName: 'ProjectJoin',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'projectId']
    }
  ]
})

// ============================================
// Team Model
// ============================================
export interface TeamAttributes {
  id: string
  projectId: string
  teamName: string
  teamNumber: number
  createdAt?: Date
  updatedAt?: Date
}

interface TeamCreationAttributes extends Optional<TeamAttributes, 'id' | 'teamNumber' | 'createdAt' | 'updatedAt'> {}

export class Team extends Model<TeamAttributes, TeamCreationAttributes> implements TeamAttributes {
  public id!: string
  public projectId!: string
  public teamName!: string
  public teamNumber!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  public readonly project?: Project
  public readonly members?: TeamMember[]
  public readonly submission?: Submission
}

Team.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  projectId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  sequelize,
  tableName: 'Team',
  modelName: 'Team',
  timestamps: true
})

// ============================================
// TeamMember Model
// ============================================
export interface TeamMemberAttributes {
  id: string
  teamId: string
  userId: string
  createdAt?: Date
}

interface TeamMemberCreationAttributes extends Optional<TeamMemberAttributes, 'id' | 'createdAt'> {}

export class TeamMember extends Model<TeamMemberAttributes, TeamMemberCreationAttributes> implements TeamMemberAttributes {
  public id!: string
  public teamId!: string
  public userId!: string
  public readonly createdAt!: Date

  public readonly team?: Team
  public readonly user?: User
}

TeamMember.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  teamId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'TeamMember',
  modelName: 'TeamMember',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['teamId', 'userId']
    }
  ]
})

// ============================================
// Submission Model
// ============================================
export interface SubmissionAttributes {
  id: string
  teamId: string
  videoUrl: string
  createdAt?: Date
  updatedAt?: Date
}

interface SubmissionCreationAttributes extends Optional<SubmissionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Submission extends Model<SubmissionAttributes, SubmissionCreationAttributes> implements SubmissionAttributes {
  public id!: string
  public teamId!: string
  public videoUrl!: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  public readonly team?: Team
}

Submission.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  teamId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'Submission',
  modelName: 'Submission',
  timestamps: true
})

// ============================================
// Reaction Model
// ============================================
export interface ReactionAttributes {
  id: string
  userId: string
  projectId: string
  reactionType: ReactionType
  createdAt?: Date
}

interface ReactionCreationAttributes extends Optional<ReactionAttributes, 'id' | 'createdAt'> {}

export class Reaction extends Model<ReactionAttributes, ReactionCreationAttributes> implements ReactionAttributes {
  public id!: string
  public userId!: string
  public projectId!: string
  public reactionType!: ReactionType
  public readonly createdAt!: Date

  public readonly user?: User
  public readonly project?: Project
}

Reaction.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  projectId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reactionType: {
    type: DataTypes.ENUM(...Object.values(ReactionType)),
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'Reaction',
  modelName: 'Reaction',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'projectId', 'reactionType']
    }
  ]
})

// ============================================
// WatchedVideo Model
// ============================================
export interface WatchedVideoAttributes {
  id: string
  userId: string
  teamId: string
  createdAt?: Date
}

interface WatchedVideoCreationAttributes extends Optional<WatchedVideoAttributes, 'id' | 'createdAt'> {}

export class WatchedVideo extends Model<WatchedVideoAttributes, WatchedVideoCreationAttributes> implements WatchedVideoAttributes {
  public id!: string
  public userId!: string
  public teamId!: string
  public readonly createdAt!: Date

  public readonly user?: User
}

WatchedVideo.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateCuid()
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teamId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'WatchedVideo',
  modelName: 'WatchedVideo',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'teamId']
    }
  ]
})

// ============================================
// AppState Model
// ============================================
export interface AppStateAttributes {
  id: string
  stage: AppStage
  sprintStartDate: Date | null
  sprintEndDate: Date | null
  testMode: boolean
  createdAt?: Date
  updatedAt?: Date
}

interface AppStateCreationAttributes extends Optional<AppStateAttributes, 'id' | 'stage' | 'sprintStartDate' | 'sprintEndDate' | 'testMode' | 'createdAt' | 'updatedAt'> {}

export class AppState extends Model<AppStateAttributes, AppStateCreationAttributes> implements AppStateAttributes {
  public id!: string
  public stage!: AppStage
  public sprintStartDate!: Date | null
  public sprintEndDate!: Date | null
  public testMode!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

AppState.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: 'singleton'
  },
  stage: {
    type: DataTypes.ENUM(...Object.values(AppStage)),
    defaultValue: AppStage.RECEIVING_SUBMISSIONS
  },
  sprintStartDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sprintEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  testMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  tableName: 'AppState',
  modelName: 'AppState',
  timestamps: true
})

// ============================================
// Associations
// ============================================

// User associations
User.hasMany(Account, { foreignKey: 'userId', as: 'accounts' })
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' })
User.hasMany(Project, { foreignKey: 'creatorId', as: 'projects' })
User.hasMany(Vote, { foreignKey: 'userId', as: 'votes' })
User.hasMany(TeamMember, { foreignKey: 'userId', as: 'teamMembers' })
User.hasMany(Reaction, { foreignKey: 'userId', as: 'reactions' })
User.hasMany(WatchedVideo, { foreignKey: 'userId', as: 'watchedVideos' })
User.hasMany(ProjectJoin, { foreignKey: 'userId', as: 'projectJoins' })
User.hasMany(Vision, { foreignKey: 'createdById', as: 'visions' })
User.hasMany(VisionLike, { foreignKey: 'userId', as: 'visionLikes' })

// Account associations
Account.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })

// Session associations
Session.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })

// Project associations
Project.belongsTo(User, { foreignKey: 'creatorId', as: 'creator', onDelete: 'CASCADE' })
Project.belongsTo(Vision, { foreignKey: 'visionId', as: 'vision', onDelete: 'SET NULL' })
Project.hasMany(Vote, { foreignKey: 'projectId', as: 'votes' })
Project.hasMany(Team, { foreignKey: 'projectId', as: 'teams' })
Project.hasMany(Reaction, { foreignKey: 'projectId', as: 'reactions' })
Project.hasMany(ProjectJoin, { foreignKey: 'projectId', as: 'joins' })

// Vision associations
Vision.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy', onDelete: 'CASCADE' })
Vision.hasMany(Project, { foreignKey: 'visionId', as: 'projects' })
Vision.hasMany(VisionLike, { foreignKey: 'visionId', as: 'likes' })

// VisionLike associations
VisionLike.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })
VisionLike.belongsTo(Vision, { foreignKey: 'visionId', as: 'vision', onDelete: 'CASCADE' })

// Vote associations
Vote.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })
Vote.belongsTo(Project, { foreignKey: 'projectId', as: 'project', onDelete: 'CASCADE' })

// ProjectJoin associations
ProjectJoin.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })
ProjectJoin.belongsTo(Project, { foreignKey: 'projectId', as: 'project', onDelete: 'CASCADE' })

// Team associations
Team.belongsTo(Project, { foreignKey: 'projectId', as: 'project', onDelete: 'CASCADE' })
Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'members' })
Team.hasOne(Submission, { foreignKey: 'teamId', as: 'submission' })

// TeamMember associations
TeamMember.belongsTo(Team, { foreignKey: 'teamId', as: 'team', onDelete: 'CASCADE' })
TeamMember.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })

// Submission associations
Submission.belongsTo(Team, { foreignKey: 'teamId', as: 'team', onDelete: 'CASCADE' })

// Reaction associations
Reaction.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })
Reaction.belongsTo(Project, { foreignKey: 'projectId', as: 'project', onDelete: 'CASCADE' })

// WatchedVideo associations
WatchedVideo.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' })

// ============================================
// Helper function to generate CUID-like IDs
// ============================================
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `c${timestamp}${randomPart}`
}

// ============================================
// Sync function
// ============================================
export async function syncDatabase(options?: { force?: boolean; alter?: boolean }) {
  try {
    await sequelize.sync(options)
    console.log('Database synchronized successfully')
  } catch (error) {
    console.error('Error synchronizing database:', error)
    throw error
  }
}

// Export sequelize instance
export { sequelize }
