import { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { isAllowedUserEmail } from "./allowedUsers";

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
      // Restrict access to users in the allowedUsers list
      return isAllowedUserEmail(user.email);
    },
  },
};
