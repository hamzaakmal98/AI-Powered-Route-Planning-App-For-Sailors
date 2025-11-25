"use client";

import {
  AlertTriangle,
  AlertCircle,
  Send,
  ChevronRight,
  MapPin,
  Lightbulb,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Mock destination data for autocomplete
const DESTINATIONS = [
  { name: "Bridgetown, Barbados", code: "BGI", country: "Barbados" },
  { name: "Barbados", code: "BGI", country: "Barbados" },
  { name: "Funchal, Madeira", code: "FNC", country: "Portugal" },
  { name: "Las Palmas, Canary Islands", code: "LPA", country: "Spain" },
  { name: "Mindelo, Cape Verde", code: "RAI", country: "Cape Verde" },
  { name: "Lisbon, Portugal", code: "LIS", country: "Portugal" },
  { name: "Casablanca, Morocco", code: "CAS", country: "Morocco" },
  { name: "Dakar, Senegal", code: "DSS", country: "Senegal" },
  { name: "Gran Canaria, Spain", code: "LPA", country: "Spain" },
  { name: "Tenerife, Spain", code: "TFS", country: "Spain" },
];

const PORTS = [
  {
    id: 1,
    name: "Funchal, Madeira",
    rating: 4.8,
    reviews: 45,
    fees: "$850-1,200/night",
    distance: "3 days",
    amenities: ["Fuel", "Water", "Provisions"],
  },
  {
    id: 2,
    name: "Las Palmas, Canary Islands",
    rating: 4.2,
    reviews: 28,
    fees: "$900-1,400/night",
    distance: "5 days",
    amenities: ["Fuel", "Booking", "Repair"],
  },
  {
    id: 3,
    name: "Mindelo, Cape Verde",
    rating: 4.5,
    reviews: 32,
    fees: "$600-900/night",
    distance: "7 days",
    amenities: ["Fuel", "Water", "Provisions", "Repair"],
  },
];

const ALL_AMENITIES = ["Fuel", "Water", "Provisions", "Booking", "Repair"];

interface ChecklistItem {
  id: string;
  category: string;
  items: {
    id: string;
    label: string;
    checked: boolean;
  }[];
}

interface ChatMessage {
  id: string;
  user: boolean;
  text: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    category: "REGULATORY COMPLIANCE",
    items: [
      { id: "visas", label: "Visas/Permits & Entry Visas", checked: false },
      { id: "insurance", label: "Insurance & Travel docs", checked: false },
    ],
    id: "",
  },
  {
    category: "ROUTE PLANNING",
    items: [
      { id: "waypoints", label: "Waypoints & Routing Drafts", checked: false },
      { id: "navigation", label: "Navigation Charts Setup", checked: false },
    ],
    id: "",
  },
  {
    category: "DESTINATION PREP",
    items: [
      { id: "provisioning", label: "Provisioning & Supplies", checked: false },
      {
        id: "accommodations",
        label: "Accommodations & Activities",
        checked: false,
      },
    ],
    id: "",
  },
];

export default function PassagePlanningPage() {
  const router = useRouter();
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(CHECKLIST_ITEMS);
  const [departure, setDeparture] = useState("Lisbon, Portugal");
  const [departureInput, setDepartureInput] = useState("Lisbon, Portugal");
  const [destination, setDestination] = useState("Bridgetown, Barbados");
  const [destinationInput, setDestinationInput] = useState(
    "Bridgetown, Barbados"
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    typeof DESTINATIONS
  >([]);
  const [validationError, setValidationError] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [portNotes, setPortNotes] = useState<Record<number, string>>({});
  const [showNotesModal, setShowNotesModal] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Update page title when destination changes
  useEffect(() => {
    document.title = `Atlantic Crossing: ${departure} to ${destination}`;
  }, [departure, destination]);

  // Save or update port note (fake database)
  const savePortNote = (portId: number, noteText: string) => {
    setPortNotes((prev) => ({ ...prev, [portId]: noteText }));
    setShowNotesModal(null);
    setNoteInput("");
  };

  // Calculate progress
  const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedItems = checklist.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.checked).length,
    0
  );
  const progressPercentage =
    totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const previousProgress = useRef(progressPercentage);
  useEffect(() => {
    if (previousProgress.current < 100 && progressPercentage === 100) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2500);
      return () => clearTimeout(timer);
    }

    previousProgress.current = progressPercentage;
  }, [progressPercentage]);

  // Handle destination input change with autocomplete
  const handleDestinationInput = (value: string) => {
    setDestinationInput(value);
    if (value.length > 0) {
      const filtered = DESTINATIONS.filter((dest) =>
        dest.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle selecting a destination from dropdown
  const selectDestination = (dest: string) => {
    setDestinationInput(dest);
    setShowSuggestions(false);
    setValidationError("");
  };

  // Validate and submit form
  const handleSubmitRoute = () => {
    // Check if both departure and destination are valid
    const isDepartureValid = DESTINATIONS.some(
      (d) => d.name.toLowerCase() === departureInput.toLowerCase()
    );
    const isDestinationValid = DESTINATIONS.some(
      (d) => d.name.toLowerCase() === destinationInput.toLowerCase()
    );

    if (!isDepartureValid || !isDestinationValid) {
      setValidationError(
        "Please select valid locations from the suggestions or enter a legitimate location."
      );
      return;
    }

    setDeparture(departureInput);
    setDestination(destinationInput);
    setValidationError("");
  };

  // Toggle amenity filter
  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  // Filter ports by amenities
  const filteredPorts = PORTS.filter((port) => {
    if (selectedAmenities.length === 0) return true;
    return selectedAmenities.every((amenity) =>
      port.amenities.includes(amenity)
    );
  });

  // Handle chat submission
  const handleSendMessage = () => {
    if (chatInput.trim() === "") return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: true,
      text: chatInput,
    };
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");
  };

  // Toggle checklist item
  const toggleChecklistItem = (categoryIdx: number, itemIdx: number) => {
    const newChecklist = [...checklist];
    newChecklist[categoryIdx].items[itemIdx].checked =
      !newChecklist[categoryIdx].items[itemIdx].checked;
    setChecklist(newChecklist);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl p-8 text-center pointer-events-auto animate-in fade-in zoom-in">
            <div className="text-5xl mb-4">⛵</div>
            <h3 className="text-3xl font-bold text-blue-600 mb-2">
              100% Complete!
            </h3>
            <p className="text-slate-600">
              Your route is fully prepared and ready to go!
            </p>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-96 max-w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Notes for {PORTS.find((p) => p.id === showNotesModal)?.name}
              </h3>
              <button
                onClick={() => setShowNotesModal(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <textarea
              value={noteInput || portNotes[showNotesModal] || ""}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add your notes here..."
              className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => savePortNote(showNotesModal, noteInput || "")}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Note
              </button>
              <button
                onClick={() => setShowNotesModal(null)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {departure} to {destination}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <MapPin className="inline w-4 h-4 mr-2" />
                    Departure
                  </label>
                  <input
                    type="text"
                    value={departureInput}
                    onChange={(e) => setDepartureInput(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <MapPin className="inline w-4 h-4 mr-2" />
                    Destination
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={destinationInput}
                      onChange={(e) => handleDestinationInput(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type a destination..."
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-10">
                        {filteredSuggestions.map((dest, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectDestination(dest.name)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg border-b border-slate-200 last:border-b-0"
                          >
                            <div className="font-medium text-slate-900">
                              {dest.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {dest.country}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {validationError && (
                <p className="text-sm text-red-600 mb-4">{validationError}</p>
              )}

              <button
                onClick={handleSubmitRoute}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Enter
              </button>

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
                      <p className="text-black text-xs">
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
                      <p className="text-black text-xs">
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
              {/* Amenities Filter */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Filter by Amenities
                </h3>
                <div className="flex flex-wrap gap-3">
                  {ALL_AMENITIES.map((amenity) => (
                    <label
                      key={amenity}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-6">
                Easy stops with detailed information and amenities.{" "}
                {filteredPorts.length} result
                {filteredPorts.length !== 1 ? "s" : ""} found.
              </p>

              <div className="space-y-6">
                {filteredPorts.map((port) => (
                  <div
                    key={port.id}
                    className="border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {port.name}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {port.distance} • {port.rating} ⭐ ({port.reviews}{" "}
                          reviews)
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                        Book Now
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-slate-600">Anchorage Fees</p>
                        <p className="font-medium text-slate-900">
                          {port.fees}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Booking</p>
                        <p className="font-medium text-slate-900">
                          via map listing
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {port.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setShowNotesModal(port.id);
                        setNoteInput(portNotes[port.id] || "");
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {portNotes[port.id] ? "View/Edit Note" : "Add Note"}
                    </button>
                  </div>
                ))}
              </div>

              {filteredPorts.length === 0 && (
                <p className="text-center text-slate-600 py-8">
                  No ports match the selected amenities. Try adjusting your
                  filters.
                </p>
              )}

              {/* AI Suggestions */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">
                      AI Suggestion: Mindelo, Cape Verde
                    </h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Based on your route and preferences for full-service
                      marinas, Mindelo is an ideal stop for provisioning before
                      the long Atlantic leg.
                    </p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                      Add to Route
                    </button>
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
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="text-right mt-2 text-sm font-semibold text-slate-900">
                  {progressPercentage}%
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-6">
                {checklist.map((category, catIdx) => (
                  <div key={category.category}>
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                      {category.category}
                    </h3>
                    <div className="space-y-2">
                      {category.items.map((item, itemIdx) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() =>
                              toggleChecklistItem(catIdx, itemIdx)
                            }
                            className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                          />
                          <span
                            className={`text-sm ${
                              item.checked
                                ? "text-slate-400 line-through"
                                : "text-slate-700 group-hover:text-slate-900"
                            }`}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
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
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-900 text-sm">
                  Ask AI Planner
                </span>
              </div>

              {/* Chat Box */}
              <div className="bg-white rounded-lg border border-slate-200 h-40 flex flex-col mb-3">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center mt-16">
                      Start asking questions about your journey...
                    </p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.user ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-xs ${
                            msg.user
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 text-slate-900"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask anything..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
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
