"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../context/CartContext";
import "../styles/homepage.css"
import { showToast } from "../../lib/toast";
import TutorialModal from "../components/TutorialModal";


interface Category {
    id: number;
    name: string;
    basePrice: string;
    earlyBirdPrice?: string;
    tier1Price?: string;
    tier1Min?: number;
    tier1Max?: number;
    tier2Price?: string;
    tier2Min?: number;
    tier2Max?: number | null;
    tier3Price?: string;
    tier3Min?: number;
    bundlePrice?: string;
    bundleSize?: number;
    earlyBirdCapacity?: number;
    earlyBirdRemaining?: number | null; // added by API
}

export default function RegistrationPage() {
    const router = useRouter();
    const { addItem, items, setUserDetails } = useCart();
    const [type, setType] = useState<"individual" | "community" | "family">("individual");
    
    const [loading, setLoading] = useState(true);
    // categories loaded from server
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [participants, setParticipants] = useState<number | "">("");
    const [jerseys, setJerseys] = useState<Record<string, number | "">>({
        XS: "", S: "", M: "", L: "", XL: "", XXL: "",
    });
    const [selectedJerseySize, setSelectedJerseySize] = useState("M");
    const [useEarlyBird, setUseEarlyBird] = useState(false);

    // Personal details
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [emergencyPhone, setEmergencyPhone] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [gender, setGender] = useState<"male" | "female">("male");
    const [currentAddress, setCurrentAddress] = useState("");
    const [nationality, setNationality] = useState<"WNI" | "WNA">("WNI");
    const [medicalHistory, setMedicalHistory] = useState("");
    const [idCardPhoto, setIdCardPhoto] = useState<File | null>(null);
    const [idCardPhotoName, setIdCardPhotoName] = useState<string | null>(null);
    const [registrationType, setRegistrationType] = useState<"individual" | "community" | "family">("individual");

    // Group/Community name state
    const [groupName, setGroupName] = useState("");

    // modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Tutorial modal state
    const [showTutorial, setShowTutorial] = useState(true); // show immediately

    // Tutorial steps - you can add/edit these easily
    const tutorialSteps = [
      {
        title: "Fill Personal Details and Pick Registration Type",
        description: "Start off by filling your personal details and picking the registration type (Individual/Community/Family)",
        image: "/images/tutorial/tut1.png",
        tip: "Prepare ID and payment proof."
      },
      {
        title: "Choose Race Distance, and Jersey Sizes",
        description: 'Choose the race distance, jersey sizes and click "Add Category To Cart" button to save the order and to add more orders',
        image: "/images/tutorial/tut2.png",
        tip: "Make sure that the jersey quantity is the same as the participant"
      },
      {
        title: "Check Cart",
        description: "Check the cart, make sure it is the same with the order placed",
        image: "/images/tutorial/tut4.png",
        tip: "Make sure that the pricing is the same"
      },
      // Upload step moved to confirmation page
    ];

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).AOS) {
            (window as any).AOS.refresh();
        }

        (async () => {
            try {
                const res = await fetch("/api/categories");
                if (!res.ok) throw new Error("Failed to load categories");
                const data = await res.json();
                setCategories(data);
                if (data.length > 0) setCategoryId(data[0].id);
            } catch (err) {
                console.error("Failed to load categories:", err);
                showToast("Failed to load categories. Please refresh the page.", "error");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // --- Move all hook-based computations here so they always run in the same order ---
    // Check if user has family bundle in cart
    const hasFamilyBundle = useMemo(() => {
        return items.some(item => item.type === "family");
    }, [items]);

    // Check if user has community registration in cart
    const hasCommunityRegistration = useMemo(() => {
        return items.some(item => item.type === "community");
    }, [items]);

    // Calculate total community participants across all cart items
    function getTotalCommunityParticipants(): number {
        return items
            .filter(item => item.type === "community" || item.type === "family")
            .reduce((sum, item) => {
                if (item.type === "family") return sum + (item.participants || 4);
                return sum + (item.participants || 0);
            }, 0);
    }

    // Calculate price based on total participants
    function calculatePrice(category: Category, totalParticipants: number, bundleType?: "family"): number {
        // Family bundle pricing
        if (bundleType === "family" && category.bundlePrice) {
            return Number(category.bundlePrice);
        }

        // AUTO-APPLY early bird for individuals only when slots remain
        if (type === "individual" && category.earlyBirdPrice && (typeof category.earlyBirdRemaining === "number" ? category.earlyBirdRemaining > 0 : false)) {
            return Number(category.earlyBirdPrice);
        }

        // Individual pricing
        if (type === "individual") {
            return Number(category.basePrice);
        }

        // Community tiered pricing based on TOTAL participants
        if (category.tier3Price && category.tier3Min && totalParticipants >= category.tier3Min) {
            return Number(category.tier3Price);
        }
        
        if (category.tier2Price && category.tier2Min) {
            if (category.tier2Max) {
                if (totalParticipants >= category.tier2Min && totalParticipants <= category.tier2Max) {
                    return Number(category.tier2Price);
                }
            } else {
                // No max means unlimited (like 3K >30)
                if (totalParticipants >= category.tier2Min) {
                    return Number(category.tier2Price);
                }
            }
        }
        
        if (category.tier1Price && category.tier1Min && category.tier1Max) {
            if (totalParticipants >= category.tier1Min && totalParticipants <= category.tier1Max) {
                return Number(category.tier1Price);
            }
        }

        return Number(category.basePrice);
    }

    // Get current price for display
    const currentPrice = useMemo(() => {
        if (!categoryId) return 0;
        const category = categories.find(c => c.id === categoryId);
        if (!category) return 0;

        if (type === "family") {
            return calculatePrice(category, 0, "family");
        }

        const currentParticipants = Number(participants || 0);
        const totalWithCurrent = getTotalCommunityParticipants() + currentParticipants;
        
        return calculatePrice(category, type === "community" ? totalWithCurrent : 1);
    }, [categoryId, categories, participants, items, type]);

    // Calculate subtotal for current category
    const currentSubtotal = useMemo(() => {
        if (type === "family") {
            const category = categories.find(c => c.id === categoryId);
            return currentPrice * (category?.bundleSize || 4);
        }
        const currentParticipants = Number(participants || 0);
        return currentPrice * currentParticipants;
    }, [currentPrice, participants, type, categoryId, categories]);

    // Calculate discount percentage
    const discountInfo = useMemo(() => {
        if (!categoryId) return null;
        const category = categories.find(c => c.id === categoryId);
        if (!category) return null;

        const basePrice = Number(category.basePrice);
        if (currentPrice >= basePrice) return null;

        const discountAmount = basePrice - currentPrice;
        const discountPercent = Math.round((discountAmount / basePrice) * 100);

        return {
            basePrice,
            discountAmount,
            discountPercent
        };
    }, [categoryId, categories, currentPrice]);

    // Display pricing breakdown (null when not available)
    const selectedCategory = categoryId ? categories.find(c => c.id === categoryId) ?? null : null;

    function updateJersey(size: string, value: number | "") {
        setJerseys((s) => ({ ...s, [size]: value }));
    }

    // Add helpers (place these above validatePersonalDetails)
    function isValidEmail(value: string) {
      // simple, practical email pattern (not full RFC)
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    }

    // Sanitize phone input: allow digits, spaces and dashes only (no letters)
    function sanitizeLocalPhoneInput(value: string) {
      // remove everything except digits, spaces and dashes
      const cleaned = (value || "").replace(/[^\d\s-]/g, "");
      // optionally collapse multiple spaces
      return cleaned.replace(/\s{2,}/g, " ").trim();
    }

    function isValidPhone(value: string) {
      // Require local-format phone starting with 0, digits only.
      // Accepts 9..15 digits total (starts with 0). Example: 081234567890
      const cleaned = (value || "").replace(/[\s-]/g, "");
      return /^0\d{8,14}$/.test(cleaned);
    }

    function validatePersonalDetails(): boolean {
        if (!fullName || !email || !phone || !birthDate || !currentAddress || !idCardPhoto) {
            showToast("Please fill all required fields (Name, Email, Phone, Birth Date, Address, and ID Card/Passport Photo)", "error");
            return false;
        }

        // Birth date must be a valid date and not in the future
        const parsedBirth = new Date(birthDate);
        if (isNaN(parsedBirth.getTime())) {
            showToast("Please enter a valid birth date", "error");
            return false;
        }
        const today = new Date();
        // compare only date parts to avoid timezone differences
        const birthDateOnly = new Date(parsedBirth.getFullYear(), parsedBirth.getMonth(), parsedBirth.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (birthDateOnly > todayOnly) {
            showToast("Birth date cannot be in the future", "error");
            return false;
        }

    // Format checks
    if (!isValidEmail(email)) {
        showToast("Please enter a valid email address", "error");
        return false;
    }

    if (!isValidPhone(phone)) {
        showToast("Please enter a valid WhatsApp number starting with 0 (e.g. 081234567890)", "error");
        return false;
    }

    if (type === "individual") {
        if (!emergencyPhone) {
            showToast("Please provide an emergency contact number", "error");
            return false;
        }
        if (!medicalHistory) {
            showToast("Please provide medical history information (or write 'None')", "error");
            return false;
        }
        // validate emergency phone format as well
        if (!isValidPhone(emergencyPhone)) {
            showToast("Please enter a valid emergency contact number starting with 0 (e.g. 081234567890)", "error");
            return false;
        }
    }

    if (type === "community") {
        if (!groupName || groupName.trim() === "") {
            showToast("Please provide a community/group name", "error");
            return false;
        }
    }

    return true;
    }

    async function savePersonalDetailsToSession() {
        try {
            sessionStorage.setItem("reg_fullName", fullName);
            sessionStorage.setItem("reg_email", email);
            sessionStorage.setItem("reg_phone", phone);
            sessionStorage.setItem("reg_emergencyPhone", emergencyPhone);
            sessionStorage.setItem("reg_birthDate", birthDate);
            sessionStorage.setItem("reg_gender", gender);
            sessionStorage.setItem("reg_currentAddress", currentAddress);
            sessionStorage.setItem("reg_nationality", nationality);
            sessionStorage.setItem("reg_medicalHistory", medicalHistory);
            sessionStorage.setItem("reg_registrationType", registrationType);
            sessionStorage.setItem("reg_groupName", groupName);

            if (idCardPhoto) {
                sessionStorage.setItem("reg_idCardPhotoName", idCardPhoto.name);
            }
        } catch (e) {
            console.error("Failed to save to sessionStorage:", e);
        }
    }

    function handleAddToCart() {
        if (!validatePersonalDetails()) return;
        if (!categoryId) return;

        const category = categories.find((c) => c.id === categoryId);
        if (!category) return;

        if (type === "family") {
            // Family bundle validation
            if (category.name !== "3km") {
                showToast("Family bundle is only available for 3km category", "error");
                return;
            }

            if (hasCommunityRegistration) {
                showToast("You cannot add a family bundle when you have community registrations in cart. Please checkout separately.", "error");
                return;
            }

            const bundleSize = category.bundleSize || 4;
            const totalJerseys = Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0);
            if (totalJerseys !== bundleSize) {
                showToast(`Jersey count (${totalJerseys}) must match family bundle size (${bundleSize})`, "error");
                return;
            }

            savePersonalDetailsToSession();

            addItem({
                type: "family",
                categoryId: category.id,
                categoryName: category.name,
                price: currentPrice,
                participants: bundleSize,
                jerseys: Object.fromEntries(
                    Object.entries(jerseys).map(([k, v]) => [k, Number(v) || 0])
                ),
            });

            showToast(`Family bundle added! ${bundleSize} people at Rp ${currentPrice.toLocaleString("id-ID")}/person`, "success");
            setJerseys({ XS: "", S: "", M: "", L: "", XL: "", XXL: "" });
            return;
        }

        // Community validation
        const currentParticipants = Number(participants || 0);
        
        // NEW: Check total participants including cart
        const totalInCart = getTotalCommunityParticipants();
        const totalWithCurrent = totalInCart + currentParticipants;
        
        if (totalWithCurrent < 10) {
            showToast(`Community registration requires a minimum of 10 total participants. You currently have ${totalInCart} in cart. Add at least ${10 - totalInCart} more.`, "error");
            return;
        }

        if (hasFamilyBundle) {
            showToast("You cannot add community registration when you have a family bundle in cart. Please checkout separately.", "error");
            return;
        }

        // FIXED: Validate jersey distribution matches participant count - MUST MATCH EXACTLY
        const totalJerseys = Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0);
        if (totalJerseys !== currentParticipants) {
            showToast(`Jersey count (${totalJerseys}) must exactly match participant count (${currentParticipants}). Please adjust jersey sizes before adding to cart.`, "error");
            return; // PREVENT adding to cart
        }

        const pricePerPerson = calculatePrice(category, totalWithCurrent);

        savePersonalDetailsToSession();

        // Add to cart
        addItem({
            type: "community",
            categoryId: category.id,
            categoryName: category.name,
            price: pricePerPerson,
            participants: currentParticipants,
            jerseys: Object.fromEntries(
                Object.entries(jerseys).map(([k, v]) => [k, Number(v) || 0])
            ),
        });

        showToast(`Category added! Total participants: ${totalWithCurrent}. Price per person: Rp ${pricePerPerson.toLocaleString("id-ID")}`, "success");

        // Reset community fields to allow adding another category
        setParticipants("");
        setJerseys({ XS: "", S: "", M: "", L: "", XL: "", XXL: "" });
    }

    // Checkout with modal (for both individual and community)
    function handleCheckout() {
        if (!validatePersonalDetails()) return;

        if (type === "individual") {
            // For individual, open modal immediately
            setAgreedToTerms(false);
            setIsModalOpen(true);
        } else if (type === "family") {
            const category = categories.find((c) => c.id === categoryId);
            if (!category || !category.bundleSize) {
                showToast("Invalid family bundle selection", "error");
                return;
            }

            const totalJerseys = Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0);
            if (totalJerseys !== category.bundleSize && totalJerseys > 0) {
                showToast(`Please complete jersey selection (${totalJerseys}/${category.bundleSize}) or clear it before checkout`, "error");
                return;
            }

            setAgreedToTerms(false);
            setIsModalOpen(true);
        } else {
            // For community, check if total meets minimum
            const currentParticipants = Number(participants || 0);
            const totalWithCurrent = getTotalCommunityParticipants() + currentParticipants;

            if (totalWithCurrent < 10) {
                showToast(`Community registration requires minimum 10 total participants. You currently have ${getTotalCommunityParticipants()} in cart.`, "error");
                return;
            }

            // If there's a current category being filled, validate it before checkout
            if (currentParticipants > 0) {
                const totalJerseys = Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0);
                if (totalJerseys !== currentParticipants) {
                    showToast(`Jersey count (${totalJerseys}) must match participant count (${currentParticipants}). Please complete or clear the current category before checkout.`, "error");
                    return;
                }
            }

            // Open modal for terms agreement
            setAgreedToTerms(false);
            setIsModalOpen(true);
        }
    }

    // Execute checkout after terms accepted
    function executeCheckout() {
        if (!categoryId) return;

        const category = categories.find((c) => c.id === categoryId);
        if (!category) return;

        savePersonalDetailsToSession();

        setUserDetails({
            fullName,
            email,
            phone,
            emergencyPhone,
            birthDate,
            gender,
            currentAddress,
            nationality,
            medicalHistory,
            idCardPhoto: idCardPhoto || undefined,
            registrationType,
            groupName: type === "community" ? groupName : undefined,
        });

        if (type === "individual") {
            // Add individual item to cart
            addItem({
                type: "individual",
                categoryId: category.id,
                categoryName: category.name,
                price: currentPrice,
                jerseySize: selectedJerseySize,
            });
        } else if (type === "family") {
            const bundleSize = category.bundleSize || 4;
            addItem({
                type: "family",
                categoryId: category.id,
                categoryName: category.name,
                price: currentPrice,
                participants: bundleSize,
                jerseys: Object.fromEntries(
                    Object.entries(jerseys).map(([k, v]) => [k, Number(v) || 0])
                ),
            });
        } else {
            // For community, add current category if filled
            const currentParticipants = Number(participants || 0);
            if (currentParticipants > 0) {
                addItem({
                    type: "community",
                    categoryId: category.id,
                    categoryName: category.name,
                    price: currentPrice,
                    participants: currentParticipants,
                    jerseys: Object.fromEntries(
                        Object.entries(jerseys).map(([k, v]) => [k, Number(v) || 0])
                    ),
                });
            }
        }

        setIsModalOpen(false);
        // Redirect to cart
        router.push("/cart");
    }

    // ADD THIS: Live tier info display for community
    const tierInfo = useMemo(() => {
        if (type !== "community" || !categoryId) return null;
        const category = categories.find(c => c.id === categoryId);
        if (!category) return null;

        const currentParticipants = Number(participants || 0);
        const totalInCart = getTotalCommunityParticipants();
        const totalWithCurrent = totalInCart + currentParticipants;

        let tier = "Base Price";
        let nextTier = null;
        let participantsToNext = 0;

        if (category.tier3Price && category.tier3Min && totalWithCurrent >= category.tier3Min) {
            tier = `Tier 3 (≥${category.tier3Min} people)`;
        } else if (category.tier2Price && category.tier2Min) {
            if (category.tier2Max && totalWithCurrent >= category.tier2Min && totalWithCurrent <= category.tier2Max) {
                tier = `Tier 2 (${category.tier2Min}-${category.tier2Max} people)`;
                if (category.tier3Price && category.tier3Min) {
                    nextTier = `Tier 3`;
                    participantsToNext = category.tier3Min - totalWithCurrent;
                }
            } else if (!category.tier2Max && totalWithCurrent >= category.tier2Min) {
                tier = `Tier 2 (≥${category.tier2Min} people)`;
            } else if (totalWithCurrent < category.tier2Min) {
                if (category.tier1Price && category.tier1Min && category.tier1Max && totalWithCurrent >= category.tier1Min) {
                    tier = `Tier 1 (${category.tier1Min}-${category.tier1Max} people)`;
                    nextTier = "Tier 2";
                    participantsToNext = category.tier2Min - totalWithCurrent;
                } else {
                    nextTier = category.tier1Min && totalWithCurrent < category.tier1Min ? "Tier 1" : "Tier 2";
                    participantsToNext = (category.tier1Min && totalWithCurrent < category.tier1Min) 
                        ? category.tier1Min - totalWithCurrent 
                        : category.tier2Min - totalWithCurrent;
                }
            }
        } else if (category.tier1Price && category.tier1Min && category.tier1Max) {
            if (totalWithCurrent >= category.tier1Min && totalWithCurrent <= category.tier1Max) {
                tier = `Tier 1 (${category.tier1Min}-${category.tier1Max} people)`;
                if (category.tier2Price && category.tier2Min) {
                    nextTier = "Tier 2";
                    participantsToNext = category.tier2Min - totalWithCurrent;
                }
            } else if (totalWithCurrent < category.tier1Min) {
                nextTier = "Tier 1";
                participantsToNext = category.tier1Min - totalWithCurrent;
            }
        }

        return {
            tier,
            nextTier,
            participantsToNext,
            totalInCart,
            totalWithCurrent,
        };
    }, [type, categoryId, categories, participants, items]);

    return (
        <main
            className="flex min-h-screen pt-28 pb-16"
            style={{
                backgroundImage: "url('/images/generalBg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div className="mx-auto w-full max-w-5xl px-4">
                <h1 className="text-4xl md:text-6xl text-center font-bold mb-8 tracking-wide text-white drop-shadow-lg font-moderniz">
                    CIPUTRA COLOR RUN
                </h1>

                <section className="bg-white/95 backdrop-blur-md rounded-lg p-8 md:p-10 shadow-lg text-gray-800" data-aos="zoom-in" data-aos-delay="200">
                    <h2 className="text-2xl font-bold text-center mb-1 text-gray-800 font-moderniz">REGISTRATION FORM</h2>
                    <p className="text-center text-sm text-gray-600 mb-6 font-mustica">Enter the details to get going</p>

                    {/* MOVED: Registration Type radios now on top for easier access */}
                    <div className="space-y-3 mb-6">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">Registration Type *</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Individual */}
                            <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${type === "individual" ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}>
                                <input type="radio" name="regType" value="individual" checked={type === "individual"} onChange={() => { setType("individual"); setRegistrationType("individual"); }} className="sr-only" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${type === "individual" ? 'border-blue-500 bg-blue-500' : 'border-gray-400 bg-white'}`}>
                                        {type === "individual" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`text-sm font-semibold text-center ${type === "individual" ? 'text-blue-700' : 'text-gray-700'}`}>Individual</span>
                                </div>
                            </label>

                            {/* Community */}
                            <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 transition-all ${hasFamilyBundle ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : type === "community" ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105 cursor-pointer' : 'border-gray-300 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer'}`}>
                                <input type="radio" name="regType" value="community" checked={type === "community"} onChange={() => { setType("community"); setRegistrationType("community"); }} disabled={hasFamilyBundle} className="sr-only" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${type === "community" ? 'border-emerald-500 bg-emerald-500' : hasFamilyBundle ? 'border-gray-300 bg-gray-100' : 'border-gray-400 bg-white'}`}>
                                        {type === "community" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`text-sm font-semibold text-center ${type === "community" ? 'text-emerald-700' : hasFamilyBundle ? 'text-gray-400' : 'text-gray-700'}`}>
                                        Community
                                        <span className="block text-xs font-normal">(Min. 10)</span>
                                    </span>
                                    {hasFamilyBundle && <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">⚠</span>}
                                </div>
                            </label>

                            {/* Family */}
                            <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 transition-all ${hasCommunityRegistration ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : type === "family" ? 'border-purple-500 bg-purple-50 shadow-lg scale-105 cursor-pointer' : 'border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer'}`}>
                                <input type="radio" name="regType" value="family" checked={type === "family"} onChange={() => { setType("family"); setRegistrationType("family"); }} disabled={hasCommunityRegistration} className="sr-only" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${type === "family" ? 'border-purple-500 bg-purple-500' : hasCommunityRegistration ? 'border-gray-300 bg-gray-100' : 'border-gray-400 bg-white'}`}>
                                        {type === "family" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`text-sm font-semibold text-center ${type === "family" ? 'text-purple-700' : hasCommunityRegistration ? 'text-gray-400' : 'text-gray-700'}`}>
                                        Family Bundle
                                        <span className="block text-xs font-normal">(4 people)</span>
                                    </span>
                                    {hasCommunityRegistration && <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">⚠</span>}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Personal details */}
                    <div className="space-y-4">
                        <div className="grid gap-3">
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Full Name (as per ID Card) <strong className = "text-red-500">*</strong></label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors text-base"
                                placeholder="Enter your full name as per Valid ID"
                                required
                            />
                        </div>

                        {/* Community/Group Name - Only show for community type */}
                        {type === "community" && (
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    Community/Group Name *
                                </label>
                                <input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors text-base"
                                    placeholder="Enter your community or group name"
                                    required
                                />
                                <p className="text-xs text-gray-500">
                                    This name will be used for all participants in your community registration
                                </p>
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email <strong className="text-red-500">*</strong></label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors text-base"
                                    placeholder="your.email@example.com"
                                    required
                                    pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                                    title="Enter a valid email address (e.g. name@example.com)"
                                />
                            </div>

                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">WhatsApp Number <strong className="text-red-500">*</strong></label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors text-base"
                                    placeholder="0812 3456 7890"
                                    required
                                    inputMode="tel"
                                    pattern="^0\d{8,14}$"
                                    title="Enter a valid local phone number starting with 0 (e.g. 081234567890)"
                                />
                            </div>
                        </div>

                        {/* Emergency Phone - Only for Individual */}
                        {type === "individual" && (
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Emergency Contact Number <strong className="text-red-500">*</strong></label>
                                <input
                                    type="tel"
                                    value={emergencyPhone}
                                    onChange={(e) => setEmergencyPhone(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors text-base"
                                    placeholder="0812 3456 7890"
                                    required
                                    inputMode="tel"
                                    pattern="^0\d{8,14}$"
                                    title="Enter a valid local phone number starting with 0 (e.g. 081234567890)"
                                />
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Birth Date <strong className="text-red-500">*</strong></label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 focus:border-blue-500 focus:outline-none transition-colors text-base"
                                    required
                                />
                            </div>

                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Gender <strong className="text-red-500">*</strong></label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value as "male" | "female")}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 focus:border-blue-500 focus:outline-none transition-colors text-base cursor-pointer"
                                    required
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Current Address <strong className="text-red-500">*</strong></label>
                            <textarea
                                value={currentAddress}
                                onChange={(e) => setCurrentAddress(e.target.value)}
                                className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors resize-none text-base"
                                placeholder="Enter your current address"
                                rows={3}
                                required
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nationality <strong className="text-red-500">*</strong></label>
                                <select
                                    value={nationality}
                                    onChange={(e) => setNationality(e.target.value as "WNI" | "WNA")}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 focus:border-blue-500 focus:outline-none transition-colors text-base cursor-pointer"
                                    required
                                >
                                    <option value="WNI">WNI (Indonesian Citizen)</option>
                                    <option value="WNA">WNA (Foreign Citizen)</option>
                                </select>
                            </div>

                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    {nationality === "WNI" ? "ID Card Photo" : "Passport Photo"} <strong className = "text-red-600">*</strong>
                                </label>
                                <label 
                                    htmlFor="idCardPhoto"
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent cursor-pointer hover:border-blue-300 transition-colors flex items-center justify-between group"
                                >
                                    <span className={`text-base ${idCardPhotoName ? "text-gray-800" : "text-gray-400"}`}>
                                        {idCardPhotoName || `Upload ${nationality === "WNI" ? "ID Card" : "Passport"}`}
                                    </span>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </label>
                                <input
                                    id="idCardPhoto"
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setIdCardPhoto(file);
                                            setIdCardPhotoName(file.name);
                                        }
                                    }}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG (Max 10MB)</p>
                            </div>
                        </div>

                        {/* Medical History - Only for Individual */}
                        {type === "individual" && (
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Medical History <strong className = "text-red-600">*</strong></label>
                                <textarea
                                    value={medicalHistory}
                                    onChange={(e) => setMedicalHistory(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors resize-none text-base"
                                    placeholder="Enter any relevant medical conditions or write 'None'"
                                    rows={3}
                                    required
                                />
                            </div>
                        )}

                        {/* Registration Type - IMPROVED RADIO BUTTONS */}
                    </div>

                    {/* Family Bundle Layout */}
                    {type === "family" && (
                        <div className="space-y-6 mt-6">
                            {/* <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <h3 className="font-semibold text-purple-900 mb-2">👨‍👩‍👧‍👦 Family Bundle - 3km Only</h3>
                                <p className="text-sm text-purple-700">
                                    Special family package for 4 people at Rp 145,000/person (Total: Rp 580,000)
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                    ⚠️ Note: Cannot be combined with community registration
                                </p>
                            </div> */}

                            <div className="rounded-lg border border-gray-200 p-5 bg-white">
                                <div className="space-y-5">
                                    <div className="grid gap-3">
                                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Race Category *</label>
                                        <select
                                            value={categoryId ?? ""}
                                            onChange={(e) => setCategoryId(Number(e.target.value))}
                                            className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 focus:border-purple-500 focus:outline-none transition-colors text-base cursor-pointer"
                                        >
                                            {categories.filter(cat => cat.bundlePrice).map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name} - Family Bundle (4 people) - Rp {Number(cat.bundlePrice).toLocaleString("id-ID")}/person
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500">Only 3km category supports family bundle</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-3">
                                            Jersey Size Distribution (4 people total) *
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                                                <div key={size} className="flex flex-col items-center">
                                                    <span className="text-xs font-medium text-gray-500 mb-2">{size}</span>
                                                    <input
                                                      type="number"
                                                      min={0}
                                                      value={jerseys[size]}
                                                      onChange={(e) => updateJersey(size, e.target.value === "" ? "" : Number(e.target.value))}
                                                      className="jersey-input shift-right"
                                                      placeholder="0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3 text-center">
                                            Total: {Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0)} / {selectedCategory?.bundleSize || 4}
                                        </p>
                                    </div>

                                    {/* Family Bundle Pricing Display */}
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-semibold text-gray-700">Price per person:</span>
                                            <div className="flex items-center gap-3">
                                                {discountInfo && (
                                                    <>
                                                        <span className="text-sm text-gray-400 line-through">
                                                            Rp {discountInfo.basePrice.toLocaleString("id-ID")}
                                                        </span>
                                                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                                            -{discountInfo.discountPercent}%
                                                        </span>
                                                    </>
                                                )}
                                                <span className="text-lg font-bold text-purple-700">
                                                    Rp {currentPrice.toLocaleString("id-ID")}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-purple-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-700">
                                                    Total Bundle ({selectedCategory?.bundleSize || 4} people):
                                                </span>
                                                <span className="text-xl font-bold text-purple-800">
                                                    Rp {currentSubtotal.toLocaleString("id-ID")}
                                                </span>
                                            </div>
                                            
                                    
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={handleAddToCart}
                                            className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                                        >
                                            ADD FAMILY BUNDLE TO CART
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={handleCheckout}
                                    className="w-1/2 md:w-1/3 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                                >
                                    Proceed to Checkout
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Community layout with improved pricing */}
                    {type === "community" && (
                        <div className="space-y-6 mt-6">
                            {/* Current Progress */}
                            {getTotalCommunityParticipants() > 0 && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <p className="text-sm font-medium text-emerald-800 mb-2">
                                        Total Community Participants in Cart: {getTotalCommunityParticipants()}
                                    </p>
                                    <p className="text-xs text-emerald-600">
                                        {getTotalCommunityParticipants() >= 10 
                                            ? "✓ Minimum requirement met! Add more for better pricing."
                                            : `Add ${10 - getTotalCommunityParticipants()} more to meet minimum.`}
                                    </p>
                                </div>
                            )}

                            <div className="rounded-lg border border-gray-200 p-5 bg-white">
                                <div className="space-y-5">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-xs text-blue-700">
                                            💡 <strong>Tip:</strong> Add multiple categories! Total participants across all categories determine your tier pricing.
                                            Example: 20 in 3K + 20 in 5K + 20 in 10K = 60 total → Best pricing tier!
                                        </p>
                                    </div>

                                    <div className="grid gap-3">
                                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Race Category *</label>
                                        <select
                                            value={categoryId ?? ""}
                                            onChange={(e) => setCategoryId(Number(e.target.value))}
                                            className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 focus:border-emerald-500 focus:outline-none transition-colors text-base cursor-pointer"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name} - Starting from Rp {Number(cat.basePrice).toLocaleString("id-ID")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-3">
                                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Number of Participants (for this category) *</label>
                                        <input
                                            type="number"
                                            min={getTotalCommunityParticipants() >= 10 ? 1 : 10}
                                            value={participants}
                                            onChange={(e) => setParticipants(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors text-base"
                                            placeholder={getTotalCommunityParticipants() >= 10 ? "Enter participant amount" : "Minimum 10 participants"}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            This will be added to your community total ({getTotalCommunityParticipants()} currently in cart)
                                        </p>
                                    </div>

                                    {/* LIVE TIER INFO */}
                                    {tierInfo && Number(participants || 0) > 0 && (
                                        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">Current Tier:</span>
                                                    <span className="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                                                        {tierInfo.tier}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Total: {tierInfo.totalWithCurrent} participants ({tierInfo.totalInCart} in cart + {Number(participants || 0)} current)
                                                </div>
                                                {tierInfo.nextTier && tierInfo.participantsToNext > 0 && (
                                                    <div className="pt-2 border-t border-purple-200">
                                                        <p className="text-xs text-purple-700">
                                                            🎯 Add <strong>{tierInfo.participantsToNext}</strong> more to unlock <strong>{tierInfo.nextTier}</strong> pricing!
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-3">
                                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Jersey Size Distribution *</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                                                <div key={size} className="flex flex-col items-center">
                                                    <span className="text-xs font-medium text-gray-500 mb-2">{size}</span>
                                                    <input
                                                      type="number"
                                                      min={0}
                                                      value={jerseys[size]}
                                                      onChange={(e) => updateJersey(size, e.target.value === "" ? "" : Number(e.target.value))}
                                                      className="jersey-input shift-right accent-[#e687a4]"
                                                      placeholder="0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3 text-center">
                                            Total: {Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0)} / {participants || 0}
                                        </p>
                                    </div>

                                    {/* Dynamic Pricing Display with Discount */}
                                    {Number(participants || 0) > 0 && (
                                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-300 rounded-lg">
                                            {/* Price per person with discount badge */}
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-semibold text-gray-700">Price per person:</span>
                                                <div className="flex items-center gap-3">
                                                    {discountInfo && (
                                                        <>
                                                            <span className="text-sm text-gray-400 line-through">
                                                                Rp {discountInfo.basePrice.toLocaleString("id-ID")}
                                                            </span>
                                                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                                                -{discountInfo.discountPercent}%
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="text-lg font-bold text-emerald-700">
                                                        Rp {currentPrice.toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Subtotal with discount calculation */}
                                            <div className="pt-3 border-t border-emerald-200">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-semibold text-gray-700">
                                                        Subtotal ({participants} people):
                                                    </span>
                                                    <div className="text-right">
                                                        {discountInfo && (
                                                            <div className="text-xs text-gray-400 line-through mb-1">
                                                                Rp {(discountInfo.basePrice * Number(participants)).toLocaleString("id-ID")}
                                                            </div>
                                                        )}
                                                        <span className="text-xl font-bold text-emerald-800">
                                                            Rp {currentSubtotal.toLocaleString("id-ID")}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                        
                                            </div>

                                            <p className="text-xs text-gray-600 mt-3">
                                                Total with cart: {getTotalCommunityParticipants() + Number(participants || 0)} participants
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={
                                                !participants || 
                                                (getTotalCommunityParticipants() + Number(participants || 0)) < 10 ||
                                                Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0) !== Number(participants || 0)
                                            }
                                            className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                        >
                                            ADD CATEGORY TO CART
                                        </button>
                                        {Number(participants || 0) > 0 && Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0) !== Number(participants || 0) && (
                                            <p className="text-center text-xs text-red-600 mt-2">
                                                ⚠️ Jersey count must match participant count to add to cart
                                            </p>
                                        )}
                                        {(getTotalCommunityParticipants() + Number(participants || 0)) < 10 && (
                                            <p className="text-center text-xs text-gray-500 mt-2">
                                                Need {10 - (getTotalCommunityParticipants() + Number(participants || 0))} more total participants (minimum 10)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={handleCheckout}
                                    className={`w-1/2 md:w-1/3 px-6 py-3 rounded-full font-semibold shadow-xl transition-all transform ${
                                        getTotalCommunityParticipants() >= 10
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white hover:shadow-2xl hover:scale-105 active:scale-95'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={getTotalCommunityParticipants() < 10}
                                >
                                    Proceed to Checkout
                                </button>
                            </div>
                            {getTotalCommunityParticipants() < 10 && (
                                <p className="text-center text-xs text-gray-500">
                                    Need {10 - getTotalCommunityParticipants()} more participants to checkout
                                </p>
                            )}
                        </div>
                    )}

                    {/* Individual layout */}
                    {type === "individual" && (
                        <div className="space-y-4 mt-6">
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Categories</label>
                                <select
                                    value={categoryId ?? ""}
                                    onChange={(e) => setCategoryId(Number(e.target.value))}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 focus:border-blue-500 focus:outline-none transition-colors text-base cursor-pointer"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name} - Rp {Number(cat.basePrice).toLocaleString("id-ID")}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-xs text-gray-500">
                                {type === "individual" && selectedCategory?.earlyBirdRemaining && selectedCategory?.earlyBirdRemaining > 0
                                    ? `Early-bird automatically applied for first ${selectedCategory?.earlyBirdCapacity} individuals (${selectedCategory?.earlyBirdRemaining} slots remaining).`
                                    : null}
                            </div>

                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                                <p className="text-sm font-semibold text-emerald-800">
                                    Price: Rp {currentPrice.toLocaleString("id-ID")}
                                </p>
                            </div>

                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Jersey Size</label>
                                <select
                                    value={selectedJerseySize}
                                    onChange={(e) => setSelectedJerseySize(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 focus:border-blue-500 focus:outline-none transition-colors text-base cursor-pointer"
                                >
                                    <option value="XS">XS</option>
                                    <option value="S">S</option>
                                    <option value="M">M</option>
                                    <option value="L">L</option>
                                    <option value="XL">XL</option>
                                    <option value="XXL">XXL</option>
                                </select>
                            </div>

                            <div className="flex justify-end items-center gap-3 mt-4">
                                <button
                                    onClick={handleCheckout}
                                    className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* Terms and Conditions Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                            <h3 className="text-2xl font-bold text-white text-center">
                                Terms & Conditions
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 text-gray-700">
                            <h4 className="font-bold text-lg text-gray-800">Registration Agreement</h4>
                            <p className="text-sm">
                                By proceeding with this registration, you acknowledge and agree to the following terms and conditions for participating in the Ciputra Color Run event:
                            </p>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <h5 className="font-semibold text-gray-800">1. Participant Information</h5>
                                    <p>All information provided must be accurate and complete. False information may result in disqualification.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">2. Health & Safety</h5>
                                    <p>Participants must be in good health and physically fit to participate. Those with medical conditions should consult a physician before registering.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">3. Payment & Refunds</h5>
                                    <p>Registration fees are non-refundable. Payment must be completed within 24 hours of registration submission.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">4. Event Rules</h5>
                                    <p>Participants must follow all event rules and instructions from organizers and staff. Failure to comply may result in removal from the event.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">5. Liability Waiver</h5>
                                    <p>The organizer is not responsible for any injury, loss, or damage during the event. Participants join at their own risk.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">6. Media Release</h5>
                                    <p>Participants consent to the use of their photos/videos taken during the event for promotional purposes.</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4 space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="mt-1 w-5 h-5 accent-[#e687a4] cursor-pointer"
                                />
                                <span className="text-sm text-gray-700">
                                    I have read and agree to the Terms & Conditions and confirm that all information provided is accurate.
                                </span>
                            </label>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setAgreedToTerms(false);
                                    }}
                                    className="flex-1 px-6 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeCheckout}
                                    disabled={!agreedToTerms}
                                    className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all transform ${
                                        agreedToTerms
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Confirm & Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tutorial Modal - New Addition */}
            {showTutorial && (
                <TutorialModal
                    isOpen={showTutorial}
                    steps={tutorialSteps}
                    onClose={() => setShowTutorial(false)}
                />
            )}
        </main>
    );
}
