import { AuthPage } from "@/components/auth-page";
import { isGoogleOAuthConfigured } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <AuthPage intent="sign-up" googleOAuthEnabled={isGoogleOAuthConfigured()} />;
}
