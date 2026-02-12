import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { SequelizeAdapter } from './sequelize-adapter'
import { User } from '../models'

// Check if Google OAuth is configured
const isGoogleConfigured = 
  !!process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' &&
  !!process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret'

console.log('[Auth] Google configured:', isGoogleConfigured)
console.log('[Auth] NODE_ENV:', process.env.NODE_ENV)

// Only enable dev login in development (not production)
const isProduction = process.env.NODE_ENV === 'production'
const enableDevLogin = !isProduction && process.env.ENABLE_DEV_LOGIN !== 'false'

export const authOptions: NextAuthOptions = {
  adapter: SequelizeAdapter(),
  providers: [
    // Google OAuth (if configured)
    ...(isGoogleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                scope: 'openid email profile https://www.googleapis.com/auth/drive.metadata.readonly',
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          }),
        ]
      : []),
    // Development credentials login (only in dev mode)
    ...(enableDevLogin
      ? [
          CredentialsProvider({
            id: 'dev-login',
            name: 'Development Login',
            credentials: {
              email: { label: 'Email', type: 'email', placeholder: 'alice@example.com' },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null

              // Find or create user
              let user = await User.findOne({
                where: { email: credentials.email },
                raw: true,
              }) as { id: string; email: string | null; name: string | null; image: string | null } | null

              if (!user) {
                // Create user if doesn't exist
                const newUser = await User.create({
                  email: credentials.email,
                  name: credentials.email.split('@')[0],
                  isAdmin: credentials.email === 'alice@example.com',
                  accessVerified: true, // Dev users bypass access verification
                })
                user = {
                  id: newUser.id,
                  email: newUser.email,
                  name: newUser.name,
                  image: newUser.image,
                }
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              }
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        // For credentials provider, user info comes from token
        const userId = user?.id || token?.sub
        if (userId) {
          session.user.id = userId
          // Fetch user data from database (use raw: true to get plain values)
          const dbUser = await User.findByPk(userId, {
            attributes: ['isAdmin', 'name', 'email', 'image', 'discipline', 'accessVerified'],
            raw: true,
          }) as { isAdmin: boolean; name: string | null; email: string | null; image: string | null; discipline: string | null; accessVerified: boolean } | null
          session.user.isAdmin = dbUser?.isAdmin ?? false
          session.user.name = dbUser?.name ?? null
          session.user.email = dbUser?.email ?? null
          session.user.image = dbUser?.image ?? null
          session.user.discipline = (dbUser?.discipline as 'DEV' | 'PRODUCT' | 'DATA' | 'DESIGNER') ?? null
          session.user.accessVerified = dbUser?.accessVerified ?? false
        }
        // Pass access token to session for Drive API calls
        session.accessToken = token?.accessToken as string | undefined
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id
      }
      // Save Google access token on initial sign-in
      if (account?.provider === 'google') {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    // Use JWT for credentials provider compatibility
    strategy: 'jwt',
  },
}

// Type augmentation for session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isAdmin: boolean
      accessVerified: boolean
      discipline: 'DEV' | 'PRODUCT' | 'DATA' | 'DESIGNER' | null
    }
    accessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
  }
}
