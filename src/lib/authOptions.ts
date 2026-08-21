import { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { isAuthenticatedUserByEmail } from "./userService";
import { isAdminUserEmail } from "./adminUsers";
import { fetchUserIdByEmail } from "./userService";

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      // Restrict access to users in the Users table.
      return await isAuthenticatedUserByEmail(user.email);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = await fetchUserIdByEmail(user.email);
        token.isAdmin = await isAdminUserEmail(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as number;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};
