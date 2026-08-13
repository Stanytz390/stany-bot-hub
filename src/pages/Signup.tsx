import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signup } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { Loader2 } from "lucide-react";

function generateFingerprint(): string {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + "x" + screen.height,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
        navigator.hardwareConcurrency || "",
        navigator.platform || ""
    ];
    let hash = 0;
    const str = components.join("|");
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16) + Math.abs(hash >> 16).toString(16);
}

export function Signup() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { login: authLogin } = useAuth();
    const [searchParams] = useSearchParams();
    const refCode = searchParams.get("ref") || "";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) navigate("/dashboard");
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !username.trim() || !password) {
            showToast("Please fill in all fields", "error");
            return;
        }

        if (username.length < 3 || username.length > 20) {
            showToast("Username must be 3-20 characters", "error");
            return;
        }

        if (!/^[a-z0-9_]+$/i.test(username)) {
            showToast("Username can only contain letters, numbers, and underscores", "error");
            return;
        }

        if (password.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setLoading(true);
        try {
            const fingerprint = generateFingerprint();
            const res = await signup(email.trim(), username.trim(), password, refCode || undefined, fingerprint);

            if (res.token && res.user) {
                authLogin(res.token, res.user as never);
                showToast("Account created successfully! 🎉", "success");
                navigate("/dashboard");
            } else {
                showToast(res.error || "Signup failed. Please try again.", "error");
            }
        } catch (error: any) {
            console.error("Signup error:", error);
            const errorMessage = error.response?.data?.error || error.message || "Signup failed. Please try again.";
            showToast(errorMessage, "error");
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
                        <CardTitle className="text-2xl">Create Account</CardTitle>
                        <CardDescription>Start hosting your bot with STANY</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {refCode && (
                            <div className="mb-4 flex items-center gap-2.5 p-3 rounded-lg bg-primary/10 border border-primary/20">
                                <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-sm text-primary">
                                    Signing up using referral code: <span className="font-mono font-semibold text-primary">{refCode}</span>
                                </p>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                                    placeholder="Choose a username"
                                    autoComplete="username"
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground mt-1">3-20 characters, letters, numbers, underscores only</p>
                            </div>
                            <div>
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Create Account
                            </Button>
                        </form>

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
                            disabled={loading}
                        >
                            Continue with GitHub
                        </Button>

                        <p className="mt-2 text-center text-xs text-muted-foreground">
                            Temporary / fake email addresses are blocked.
                        </p>

                        <p className="text-center text-sm text-muted-foreground mt-4">
                            Already have an account?{" "}
                            <Link to="/login" className="text-primary hover:underline">
                                Login
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}