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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessName.trim() || !state) return;

    if (gstin && !isValidGSTIN(gstin)) {
      toast.error("Invalid GSTIN format");
      return;
    }

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
      await organizationRepo.insert(org);
      await organizationMemberRepo.insert({
        userId: user.id,
        organizationId: orgId,
        role: "owner",
      });
      toast.success("Organization created!");
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error("Failed to create organization: " + (err as Error).message);
    } finally {
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
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Solutions Pvt Ltd"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select value={state} onValueChange={setState} required>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN (optional)</Label>
              <Input
                id="gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 27AAPFU0939F1ZV"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you're a freelancer or not GST-registered
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !businessName.trim() || !state}>
              {submitting ? "Creating..." : "Get Started"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
