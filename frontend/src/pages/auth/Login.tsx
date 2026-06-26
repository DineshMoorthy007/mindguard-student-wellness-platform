import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormItem } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid university email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const loggedUser = await login(data.email, data.password);
      toast({
        title: "Welcome back!",
        description: "Successfully authenticated to MindGuard.",
        variant: "success",
      });

      // Redirect depending on the user credentials role
      if (loggedUser.role === "STUDENT") {
        navigate("/student/dashboard");
      } else if (loggedUser.role === "COUNSELOR") {
        navigate("/counselor/dashboard");
      } else if (loggedUser.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/login");
      }
    } catch (error: any) {
      const apiError = error.response?.data?.detail || {};
      toast({
        title: "Authentication Failed",
        description: apiError.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      {/* Visual Excellence Backdrops - Glowing Blurs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-3 animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            MindGuard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Student Mental Health & Alert Management Gateway</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Log in</CardTitle>
            <CardDescription className="text-slate-400">
              Access your wellness checks and student dashboards
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {/* Email Address input */}
              <FormItem>
                <Label htmlFor="email" className="text-slate-300">University Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@university.edu"
                  className="border-slate-800 bg-slate-950/50 text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
                  {...register("register" in errors ? "email" : "email")} // standard register hook binding
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium mt-1">{errors.email.message}</p>
                )}
              </FormItem>

              {/* Password Input */}
              <FormItem>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="border-slate-800 bg-slate-950/50 text-white placeholder:text-slate-600 pr-10 focus-visible:ring-violet-500"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium mt-1">{errors.password.message}</p>
                )}
              </FormItem>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white shadow-md shadow-violet-600/10 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  "Access Gateway"
                )}
              </Button>
              <div className="text-xs text-center text-slate-400 mt-2">
                New to the platform?{" "}
                <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  Create an account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
export default Login;
