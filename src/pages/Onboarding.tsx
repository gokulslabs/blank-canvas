import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { organizationRepo } from "@/repositories/organizationRepo";
import { organizationMemberRepo } from "@/repositories/organizationMemberRepo";
import { Organization } from "@/types/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { INDIAN_STATES, isValidGSTIN } from "@/lib/gst";
import { Zap } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [state, setState] = useState("");
  const [gstin, setGstin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ businessName?: string; state?: string; gstin?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!businessName.trim()) errs.businessName = "Business name is required";
    if (!state) errs.state = "Please select your state";
    if (gstin && !isValidGSTIN(gstin)) errs.gstin = "Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const orgId = crypto.randomUUID();
      const org: Organization = {
        id: orgId,
        name: businessName.trim(),
        currency: "INR",
        ownerId: user.id,
        gstin: gstin || undefined,
        state,
        createdAt: new Date().toISOString(),
      };

      console.log("[Onboarding] Creating organization:", orgId);
      await organizationRepo.insert(org);
      console.log("[Onboarding] Organization created successfully");

      console.log("[Onboarding] Adding membership for user:", user.id);
      await organizationMemberRepo.insert({
        userId: user.id,
        organizationId: orgId,
        role: "owner",
      });
      console.log("[Onboarding] Membership created successfully");

      toast.success("Organization created! Redirecting...");
      // Small delay to let toast show, then hard navigate to reload AppContext
      setTimeout(() => {
        window.location.href = "/app";
      }, 500);
    } catch (err) {
      console.error("[Onboarding] Error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to create organization: " + message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-xl bg-primary flex items-center justify-center mb-2">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Set up your business</CardTitle>
          <CardDescription>
            Tell us about your business to get started with Yoho-Books
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (errors.businessName) setErrors((p) => ({ ...p, businessName: undefined }));
                }}
                placeholder="e.g. Acme Solutions Pvt Ltd"
                required
                maxLength={100}
                className={errors.businessName ? "border-destructive" : ""}
              />
              {errors.businessName && (
                <p className="text-xs text-destructive">{errors.businessName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select value={state} onValueChange={(v) => {
                setState(v);
                if (errors.state) setErrors((p) => ({ ...p, state: undefined }));
              }} required>
                <SelectTrigger id="state" className={errors.state ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-xs text-destructive">{errors.state}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN (optional)</Label>
              <Input
                id="gstin"
                value={gstin}
                onChange={(e) => {
                  setGstin(e.target.value.toUpperCase());
                  if (errors.gstin) setErrors((p) => ({ ...p, gstin: undefined }));
                }}
                placeholder="e.g. 27AAPFU0939F1ZV"
                maxLength={15}
                className={errors.gstin ? "border-destructive" : ""}
              />
              {errors.gstin ? (
                <p className="text-xs text-destructive">{errors.gstin}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Leave blank if you're a freelancer or not GST-registered
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Creating...
                </span>
              ) : (
                "Get Started"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
