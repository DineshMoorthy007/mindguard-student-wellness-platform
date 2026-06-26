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
import { UserRole } from "@/contexts/AuthContext";

// Registration validation schema
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  role: z.enum(["STUDENT", "COUNSELOR", "ADMIN"], {
    errorMap: () => ({ message: "Please select an account type." })
  })
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      role: "STUDENT"
    }
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      await registerUser(data.email, data.password, data.role);
      toast({
        title: "Account Created!",
        description: "Registration completed successfully. You can now log in.",
        variant: "success"
      });
      navigate("/login");
    } catch (error: any) {
      const apiError = error.response?.data?.detail || {};
      toast({
        title: "Registration Failed",
        description: apiError.message || "Failed to create account. Email may already be in use.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-12 w-12 rounded-2xl border border-slate-800 overflow-hidden shadow-lg shadow-violet-500/10 mb-3 bg-slate-900 flex items-center justify-center">
            <img src="/favicon.jpg" alt="MindGuard Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            MindGuard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Student Mental Health & Alert Management Gateway</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Create Account</CardTitle>
            <CardDescription className="text-slate-400">
              Join the university wellness network
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {/* Account Type Selector (Button tabs style for premium visual interaction) */}
              <FormItem>
                <Label className="text-slate-300">Account Type</Label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  {(["STUDENT", "COUNSELOR", "ADMIN"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setValue("role", r, { shouldValidate: true })}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wider transition-all ${
                        selectedRole === r
                          ? "bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow shadow-violet-500/10"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {errors.role && (
                  <p className="text-xs text-destructive font-medium mt-1">{errors.role.message}</p>
                )}
              </FormItem>

              {/* Email Address */}
              <FormItem>
                <Label htmlFor="email" className="text-slate-300">University Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@university.edu"
                  className="border-slate-800 bg-slate-950/50 text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium mt-1">{errors.email.message}</p>
                )}
              </FormItem>

              {/* Password */}
              <FormItem>
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
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
                    Creating Profile...
                  </>
                ) : (
                  "Register Account"
                )}
              </Button>
              <div className="text-xs text-center text-slate-400 mt-2">
                Already registered?{" "}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
export default Register;
