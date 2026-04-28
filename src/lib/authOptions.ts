import { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { isAdminUserEmail } from "./adminUsers";

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
      // Restrict access to users marked as admins in the Users table.
      try {
        return await isAdminUserEmail(user.email);
      } catch {
        return false;
      }
    },
  },
};
