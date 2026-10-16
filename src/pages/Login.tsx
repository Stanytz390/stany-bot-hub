import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login, githubStatus, getMe } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { Loader2, Github } from "lucide-react";

export function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [githubEnabled, setGithubEnabled] = useState(false);
  const { refreshUser } = useAuth();

  // GitHub OAuth returns here with a token in the query string.
  useEffect(() => {
    // Already signed in? Go straight to the dashboard.
    if (!searchParams.get("gh_token") && localStorage.getItem("token")) {
      navigate("/dashboard", { replace: true });
      return;
    }
    githubStatus().then((r) => setGithubEnabled(Boolean(r?.enabled))).catch(() => {});
    const ghToken = searchParams.get("gh_token");
    const err = searchParams.get("error");
    if (err) showToast(err, "error");
    if (ghToken) {
      localStorage.setItem("token", ghToken);
      getMe()
        .then((u) => {
          if (u?.id) {
            authLogin(ghToken, u);
            showToast("Signed in with GitHub", "success");
            navigate(searchParams.get("next") || "/dashboard");
          } else {
            showToast("GitHub sign-in failed", "error");
          }
        })
        .catch(() => showToast("GitHub sign-in failed", "error"));
    }
    void refreshUser;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await login(usernameOrEmail.trim(), password);
      if (res.needsVerification && res.email) {
        showToast(res.error || "Verify your email to continue", "error");
        navigate(`/verify-email?email=${encodeURIComponent(res.email)}`);
        return;
      }
      if (res.token && res.user) {
        authLogin(res.token, res.user);
        showToast("Login successful", "success");
        const ref = searchParams.get("ref");
        if (ref) {
          navigate(`/signup?ref=${ref}`);
        } else {
          navigate("/dashboard");
        }
      } else {
        showToast(res.error || "Invalid credentials", "error");
      }
    } catch {
      showToast("Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-[1]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 overflow-hidden">
              <img
                src="https://www.image2url.com/r2/default/images/1785618177825-5b3fb0ba-cb13-44e3-8010-43af4a311fd4.jpg"
                alt="STANY Host"
                className="w-12 h-12 rounded-full object-cover"
              />
            </div>
            <CardTitle className="text-2xl font-display font-extrabold text-white">Stany Host Nexus</CardTitle>
            <CardDescription className="text-xs text-zinc-400">Sign in to your games, cinema, bots & hosting workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter username or email"
                  autoComplete="username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Login
              </Button>
            </form>

            {githubEnabled && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => { window.location.href = "/api/auth/github"; }}
                >
                  <Github className="mr-2 h-4 w-4" />
                  Continue with GitHub
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Verified GitHub accounts only — no fake emails.
                </p>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}