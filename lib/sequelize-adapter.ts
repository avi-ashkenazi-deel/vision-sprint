import type { Adapter, AdapterAccount, AdapterSession, AdapterUser, VerificationToken as AdapterVerificationToken } from 'next-auth/adapters'
import { User, Account, Session, VerificationToken } from '../models'

export function SequelizeAdapter(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, 'id'>) {
      try {
        console.log('[Adapter] createUser:', data.email)
        const user = await User.create({
          name: data.name,
          email: data.email,
          emailVerified: data.emailVerified,
          image: data.image,
        })
        console.log('[Adapter] createUser success:', user.id)
        return {
          id: user.id,
          name: user.name,
          email: user.email!,
          emailVerified: user.emailVerified,
          image: user.image,
        } as AdapterUser
      } catch (error) {
        console.error('[Adapter] createUser error:', error)
        throw error
      }
    },

    async getUser(id: string) {
      try {
        const user = await User.findByPk(id)
        if (!user) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email!,
          emailVerified: user.emailVerified,
          image: user.image,
        } as AdapterUser
      } catch (error) {
        console.error('[Adapter] getUser error:', error)
        throw error
      }
    },

    async getUserByEmail(email: string) {
      try {
        console.log('[Adapter] getUserByEmail:', email)
        const user = await User.findOne({ where: { email } })
        if (!user) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email!,
          emailVerified: user.emailVerified,
          image: user.image,
        } as AdapterUser
      } catch (error) {
        console.error('[Adapter] getUserByEmail error:', error)
        throw error
      }
    },

    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      try {
        console.log('[Adapter] getUserByAccount:', provider, providerAccountId)
        const account = await Account.findOne({
          where: { provider, providerAccountId },
          include: [{ model: User, as: 'user' }],
        })
        if (!account?.user) return null
        const user = account.user
        return {
          id: user.id,
          name: user.name,
          email: user.email!,
          emailVerified: user.emailVerified,
          image: user.image,
        } as AdapterUser
      } catch (error) {
        console.error('[Adapter] getUserByAccount error:', error)
        throw error
      }
    },

    async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, 'id'>) {
      try {
        const user = await User.findByPk(data.id)
        if (!user) throw new Error('User not found')
        
        await user.update({
          name: data.name ?? user.name,
          email: data.email ?? user.email,
          emailVerified: data.emailVerified ?? user.emailVerified,
          image: data.image ?? user.image,
        })
        
        return {
          id: user.id,
          name: user.name,
          email: user.email!,
          emailVerified: user.emailVerified,
          image: user.image,
        } as AdapterUser
      } catch (error) {
        console.error('[Adapter] updateUser error:', error)
        throw error
      }
    },

    async deleteUser(userId: string) {
      await User.destroy({ where: { id: userId } })
    },

    async linkAccount(data: AdapterAccount) {
      try {
        console.log('[Adapter] linkAccount:', data.provider, data.userId)
        await Account.create({
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token ?? null,
          access_token: data.access_token ?? null,
          expires_at: data.expires_at ?? null,
          token_type: data.token_type ?? null,
          scope: data.scope ?? null,
          id_token: data.id_token ?? null,
          session_state: data.session_state as string ?? null,
        })
        console.log('[Adapter] linkAccount success')
        return data as AdapterAccount
      } catch (error) {
        console.error('[Adapter] linkAccount error:', error)
        throw error
      }
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      await Account.destroy({
        where: { provider, providerAccountId },
      })
    },

    async createSession(data: { sessionToken: string; userId: string; expires: Date }) {
      const session = await Session.create({
        sessionToken: data.sessionToken,
        userId: data.userId,
        expires: data.expires,
      })
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      } as AdapterSession
    },

    async getSessionAndUser(sessionToken: string) {
      const session = await Session.findOne({
        where: { sessionToken },
        include: [{ model: User, as: 'user' }],
      })
      if (!session?.user) return null
      
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email!,
          emailVerified: session.user.emailVerified,
          image: session.user.image,
        },
      }
    },

    async updateSession(data: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>) {
      const session = await Session.findOne({
        where: { sessionToken: data.sessionToken },
      })
      if (!session) return null
      
      await session.update({
        expires: data.expires ?? session.expires,
      })
      
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires,
      } as AdapterSession
    },

    async deleteSession(sessionToken: string) {
      await Session.destroy({ where: { sessionToken } })
    },

    async createVerificationToken(data: AdapterVerificationToken) {
      await VerificationToken.create({
        identifier: data.identifier,
        token: data.token,
        expires: data.expires,
      })
      return data as AdapterVerificationToken
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const verificationToken = await VerificationToken.findOne({
        where: { identifier, token },
      })
      if (!verificationToken) return null
      
      await verificationToken.destroy()
      
      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires,
      } as AdapterVerificationToken
    },
  }
}
