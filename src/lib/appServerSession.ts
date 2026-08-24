import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export function getAppServerSession() {
  return getServerSession(authOptions);
}
 
