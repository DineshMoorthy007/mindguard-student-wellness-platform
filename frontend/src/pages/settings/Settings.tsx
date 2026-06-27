import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/ui/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  User as UserIcon, Shield, Bell, Moon, Sun, Lock, CheckCircle
} from "lucide-react";

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Notification states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <p className="text-muted-foreground text-sm md:text-base">Please log in to view settings.</p>
      </div>
    );
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill out all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);
    // Simulate API delay
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password Updated",
        description: "Your account password has been changed successfully.",
        variant: "success"
      });
    }, 1200);
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Preferences Saved",
      description: "Your notification settings have been updated in your profile.",
      variant: "success"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-foreground text-lg md:text-xl font-extrabold">Account Settings</h3>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">Manage your preferences, security settings, and styling choices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Account Details */}
        <div className="space-y-6 md:col-span-1">
          <Card className="border-border/70 bg-card/50 backdrop-blur-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-sm md:text-base font-bold flex items-center gap-2">
                <UserIcon className="h-4.5 w-4.5 text-primary" />
                Profile Info
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Your registered account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-extrabold text-lg">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{user.role}</p>
                </div>
              </div>

              <div className="border-t border-border/70 pt-4 space-y-2.5 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-xs text-foreground">{user.id.substring(0, 18)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Selector */}
          <Card className="border-border/70 bg-card/50 backdrop-blur-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-sm md:text-base font-bold flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="h-4.5 w-4.5 text-primary" />
                ) : (
                  <Sun className="h-4.5 w-4.5 text-primary" />
                )}
                Appearance
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Select your dashboard theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs md:text-sm font-bold transition-all duration-200 ${
                    theme === "light"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/70 text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs md:text-sm font-bold transition-all duration-200 ${
                    theme === "dark"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/70 text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="space-y-6 md:col-span-2">
          
          {/* Change Password Card */}
          <Card className="border-border/70 bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-foreground text-sm md:text-base font-bold flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Change your account password safely</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 text-xs md:text-sm bg-background/50 border-border/70"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 text-xs md:text-sm bg-background/50 border-border/70"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 text-xs md:text-sm bg-background/50 border-border/70"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs md:text-sm h-10 px-5 rounded-xl transition-all duration-300"
                  >
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="border-border/70 bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-foreground text-sm md:text-base font-bold flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Select how you want to receive early warning alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-foreground">Critical Warning Alerts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Receive immediate notifications for high-risk assessments.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-border/70 text-primary focus:ring-primary accent-primary"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-foreground">Weekly Aggregate Digests</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Receive a weekly clinical summary of mental wellness score trends.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-border/70 text-primary focus:ring-primary accent-primary"
                  />
                </div>

                <div className="flex items-center justify-between pb-1">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-foreground">In-App Live Toast Feed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Show popup banners inside the dashboard for instant status changes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushAlerts}
                    onChange={(e) => setPushAlerts(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-border/70 text-primary focus:ring-primary accent-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveNotifications}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs md:text-sm h-10 px-5 rounded-xl transition-all duration-300"
                >
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default Settings;
