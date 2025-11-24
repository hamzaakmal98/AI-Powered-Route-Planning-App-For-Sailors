"use client";

import { AlertTriangle, AlertCircle, Send, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const colors = ["#3b82f6", "#1e40af", "#fbbf24", "#fcd34d", "#ec4899"];

const generateConfetti = () => {
  return Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: i * 30,
  }));
};

export default function Index() {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [checklist, setChecklist] = useState({
    passport: false,
    visas: true,
    weather: true,
    charts: false,
    provisioning: true,
    anchorages: true,
  });

  const confetti = useMemo(() => generateConfetti(), []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setChatInput("");
  };

  const handleChecklistChange = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalItems = Object.keys(checklist).length;
  const checkedItems = Object.values(checklist).filter(Boolean).length;
  const progressPercentage = Math.round((checkedItems / totalItems) * 100);

  useEffect(() => {
    if (progressPercentage === 100) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [progressPercentage]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Confetti pieces */}
          {confetti.map((item) => (
            <div
              key={`confetti-${item.id}`}
              className="absolute animate-confetti"
              style={{
                left: `${item.left}%`,
                top: "-10px",
                width: "10px",
                height: "10px",
                backgroundColor: item.color,
                borderRadius: "50%",
                animationDelay: `${item.delay}ms`,
              }}
            />
          ))}

          {/* Center celebration message */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center animate-bounce-scale">
              <div className="text-6xl mb-4">⛵</div>
              <h3 className="text-3xl font-bold text-blue-600 mb-2">
                100% Complete!
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Atlantic Crossing: Lisbon to Barbados
          </h1>
          <p className="text-sm text-muted-foreground">
            Total Distance: 5,680 KM • Estimated Duration: 21 Days
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Route Information */}
            <section className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Route Information
              </h2>
              <div className="space-y-3 text-sm text-foreground">
                <div>
                  <span className="font-medium">Departure:</span> Lisbon,
                  Portugal
                </div>
                <div>
                  <span className="font-medium">Arrival:</span> Bridgetown,
                  Barbados
                </div>
                <div>
                  <span className="font-medium">Waypoints:</span> Madeira,
                  Canary Islands
                </div>
              </div>

              {/* Warning Box */}
              <div className="mt-4 p-3 bg-gray-50 border border-border rounded-md flex gap-3">
                <AlertTriangle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  <span className="font-semibold">AI Warning:</span> Caution in
                  high traffic zone near Strait of Gibraltar. Favorable weather
                  window predicted for Nov 15-18.
                </p>
              </div>
            </section>

            {/* Logistics & Permissions */}
            <section className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Logistics & Permissions
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-2">
                    Customs & Immigration
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Must process immediately upon arrival. US citizens: Visa not
                    required for stays up to 6 months. Others: Check specific
                    requirements.
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <p className="text-muted-foreground">Phone:</p>
                      <p className="text-foreground font-medium">
                        +1 (246) 430-5950
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="text-muted-foreground">Email:</p>
                      <p className="text-foreground font-medium break-all">
                        customs@barbados.gov.bb
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="text-muted-foreground">Website:</p>
                      <p className="text-accent text-xs">
                        www.barbados.gov.bb/customs
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-2">
                    Cruising Permit
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Fee: $300 USD. Apply online or on arrival. Valid for 30
                    months, extendable.
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <p className="text-muted-foreground">Phone:</p>
                      <p className="text-foreground font-medium">
                        +1 (246) 228-0950
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="text-muted-foreground">Email:</p>
                      <p className="text-foreground font-medium break-all">
                        permits@barbadosmaritimeauth.com
                      </p>
                    </div>
                    <div className="text-xs">
                      <p className="text-muted-foreground">Website:</p>
                      <p className="text-accent text-xs">
                        www.barbadosports.com/cruising
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Regulations */}
            <section className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Regulations
              </h2>
              <p className="text-xs text-muted-foreground">
                Strictly enforced MMAs around Estancia Cays. No-sail zones near
                military bases.
              </p>
            </section>

            {/* Ports & Anchorages */}
            <section className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Ports & Anchorages
              </h2>
              <p className="text-xs text-muted-foreground mb-6">
                A list of planned stops with their amenities.
              </p>

              {/* Port Card 1 */}
              <div className="mb-8 pb-8 border-b border-border last:border-b-0">
                <h3 className="font-semibold text-foreground mb-4 text-sm">
                  Funchal, Madeira
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2 text-muted-foreground text-xs">
                    <span>⚓</span>
                    <span>🚢</span>
                    <span>🍽</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-1">
                      Coordinates
                    </p>
                    <p className="text-xs text-foreground">32.65°N, 16.90°W</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-1">
                      Contact
                    </p>
                    <p className="text-xs text-foreground">+351 291 208 600</p>
                  </div>
                </div>
              </div>

              {/* Port Card 2 */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 text-sm">
                  Las Palmas, Canary Is.
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2 text-muted-foreground text-xs">
                    <span>⚓</span>
                    <span>🚢</span>
                    <span>🍽</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-1">
                      Coordinates
                    </p>
                    <p className="text-xs text-foreground">28.14°N, 15.41°W</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-1">
                      Contact
                    </p>
                    <p className="text-xs text-foreground">+34 928 21 64 00</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Passage Planning */}
            <section className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                PASSAGE PLANNING
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Overall Progress
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {progressPercentage}%
                  </p>
                </div>
              </div>

              {/* Attention */}
              <div className="mt-4 p-3 bg-warning/20 border border-warning/30 rounded-md">
                <p className="text-xs font-semibold text-warning-foreground mb-1">
                  Attention
                </p>
                <p className="text-xs text-warning-foreground/90">
                  Cruising permit application due soon.
                </p>
              </div>

              {/* Next Step */}
              <div className="mt-4 p-3 bg-blue-50 border border-accent/30 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Next Step
                  </p>
                  <p className="text-xs text-foreground mt-0.5">
                    Finalize route through Canary Islands.
                  </p>
                </div>
              </div>
            </section>

            {/* Ask AI Planner */}
            <section className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center flex-shrink-0">
                  ★
                </span>
                Ask AI Planner
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Any tips for clearing customs in Bridgetown?
              </p>
              <div className="bg-accent text-white p-3 rounded-md mb-4">
                <p className="text-xs leading-relaxed">
                  Of course! Ensure you have your ship&apos;s documentation,
                  completed customs declaration form, proof of ownership (Bill
                  of Sale), and valid ID. Show any completed customs declaration
                  form ready. Pre-gate entry through customs is located at...
                </p>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your route..."
                  className="flex-1 px-3 py-2 text-xs border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </section>

            {/* Preparation Checklist */}
            <section className="bg-white rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Preparation Checklist
                </h2>
                <span className="text-xs font-semibold text-orange-600">
                  {checkedItems}/{totalItems} critical
                </span>
              </div>

              {/* Regulatory Compliance */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-foreground mb-2">
                  REGULATORY COMPLIANCE
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checklist.passport}
                      onChange={() => handleChecklistChange("passport")}
                    />
                    <span>Valid Passport to Ship&apos;s Papers</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checklist.visas}
                      onChange={() => handleChecklistChange("visas")}
                    />
                    <span>Visas / Permits</span>
                    <span className="text-orange-600 text-xs font-semibold ml-auto">
                      In Progress
                    </span>
                  </label>
                  <div className="flex gap-1 text-xs text-muted-foreground ml-6 mt-1">
                    <span>📄 Documents</span>
                    <span>🔔 Reminders</span>
                  </div>
                </div>
              </div>

              {/* Route Planning */}
              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">
                    ROUTE PLANNING
                  </p>
                  <span className="text-orange-600 text-xs font-semibold">
                    High-Priority
                  </span>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checklist.weather}
                      onChange={() => handleChecklistChange("weather")}
                    />
                    <span>Weather & Routing Analysis</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checklist.charts}
                      onChange={() => handleChecklistChange("charts")}
                    />
                    <span>Navigate Charts & Reading</span>
                  </label>
                </div>
              </div>

              {/* Destination Prep */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">
                    DESTINATION PREP
                  </p>
                  <span className="text-accent text-xs font-semibold">
                    Important
                  </span>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checklist.provisioning}
                      onChange={() => handleChecklistChange("provisioning")}
                    />
                    <span>Provisioning & Supplies</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checklist.anchorages}
                      onChange={() => handleChecklistChange("anchorages")}
                    />
                    <span>Anchorages & Ports Research</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      1 Planned Step
                    </span>
                  </label>
                  <div className="flex gap-1 text-xs text-muted-foreground ml-6 mt-1">
                    <span>🗺️ Map Vistr</span>
                    <span>📝 My Notes</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <Button
        variant="outline"
        className="mt-8 flex justify-center mx-auto mb-12"
        onClick={() => {
          router.push("/dashboard");
        }}
      >
        Back to Dashboard
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
