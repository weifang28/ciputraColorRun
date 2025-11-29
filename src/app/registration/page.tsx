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
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [existingIdCardPhotoUrl, setExistingIdCardPhotoUrl] = useState<string | null>(null);

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
    const [medicationAllergy, setMedicationAllergy] = useState(""); // NEW
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
        image: "/images/tutorial/tut1.jpg",
        tip: "Prepare ID"
      },
      {
        title: "Choose Race Distance, and Jersey Sizes",
        description: 'Choose the race distance, jersey sizes and click "Add Category To Cart" button to save the order and to add more orders',
        image: "/images/tutorial/tut2.jpg",
        tip: "Make sure that the jersey quantity is the same as the participant"
      },
      {
        title: "Check Cart",
        description: "Check the cart, make sure it is the same with the order placed",
        image: "/images/tutorial/tut4.jpg",
        tip: "Make sure that the total price is correct and prepare the proof of payment"
      },
      // Upload step moved to confirmation page
    ];

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).AOS) {
            (window as any).AOS.refresh();
        }

        // Try to load current logged-in user profile to prefill form
        (async () => {
            try {
                const resUser = await fetch("/api/user");
                if (resUser.ok) {
                    const body = await resUser.json().catch(() => ({}));
                    const user = body?.user;
                    if (user) {
                        setCurrentUser(user);
                        // Prefill form fields from user record (do not override while typing later)
                        setFullName(user.name || "");
                        setEmail(user.email || "");
                        setPhone(user.phone || "");
                        setEmergencyPhone(user.emergencyPhone || "");
                        setBirthDate(user.birthDate ? new Date(user.birthDate).toISOString().slice(0,10) : "");
                        setGender(user.gender || "male");
                        setCurrentAddress(user.currentAddress || "");
                        setNationality(user.nationality || "WNI");
                        setMedicalHistory(user.medicalHistory || "");
                        setMedicationAllergy(user.medicationAllergy || ""); // NEW
                        if (user.idCardPhoto) {
                            setExistingIdCardPhotoUrl(user.idCardPhoto);
                            // show filename if available
                            try {
                                const parts = String(user.idCardPhoto).split("/");
                                setIdCardPhotoName(parts[parts.length - 1] || "Uploaded ID");
                            } catch { /* ignore */ }
                        }
                    }
                }
            } catch (err) {
                // silent fail — not logged in or endpoint unavailable
                // console.debug("No current user", err);
            }
        })();

        // Fetch categories - always fetch fresh data on mount
        (async () => {
            try {
                const res = await fetch(`/api/categories`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });
                if (!res.ok) throw new Error("Failed to load categories");
                const data = await res.json();
                setCategories(data);
                if (data.length > 0) setCategoryId(data[0].id);
                
                console.log('[Registration] Loaded categories with early bird:', 
                    data.map((c: any) => ({ 
                        name: c.name, 
                        capacity: c.earlyBirdCapacity, 
                        remaining: c.earlyBirdRemaining 
                    }))
                );
            } catch (err) {
                console.error("Failed to load categories:", err);
                showToast("Failed to load categories. Please refresh the page.", "error");
            } finally {
                setLoading(false);
            }
        })();
    }, []); // Empty dependency array - only run on mount

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
        // Accept either a newly uploaded idCardPhoto file OR an existing stored ID photo URL for logged-in users
        const hasIdProof = Boolean(idCardPhoto) || Boolean(existingIdCardPhotoUrl);
        if (!fullName || !email || !phone || !birthDate || !currentAddress || !hasIdProof) {
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
        showToast("Please enter a valid email address (e.g. user@example.com)", "error");
        return false;
    }

    if (!isValidPhone(phone)) {
        showToast("Please enter a valid WhatsApp number starting with 0 (e.g. 081234567890), length 9 to 15 digits", "error");
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
        if (!medicationAllergy) {
            showToast("Please provide medication allergy information (or write 'None')", "error");
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

    function savePersonalDetailsToSession() {
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
            sessionStorage.setItem("reg_medicationAllergy", medicationAllergy); // NEW
            // store the filename for convenience (either newly uploaded file name or existing saved file name)
            if (idCardPhoto) {
                 sessionStorage.setItem("reg_idCardPhotoName", idCardPhoto.name);
            } else if (existingIdCardPhotoUrl) {
                try {
                    const parts = String(existingIdCardPhotoUrl).split("/");
                    sessionStorage.setItem("reg_idCardPhotoName", parts[parts.length - 1] || "Uploaded ID");
                } catch { /* ignore */ }
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

            const bundleSize = category.bundleSize || 4;
            const totalJerseys = Object.values(jerseys).reduce<number>((sum, val) => sum + Number(val || 0), 0);
            if (totalJerseys !== bundleSize) {
                showToast(`Jersey count (${totalJerseys}) must match family bundle size (${bundleSize})`, "error");
                return;
            }

            // Add family bundle to cart
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

            // UX: after adding a family bundle, switch the registration radio back to Individual
            // so the form doesn't show family-specific inputs and avoids confusion.
            setType("individual");
            setRegistrationType("individual");

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

        // set user details in cart/context; if there is no newly uploaded File for idCardPhoto,
        // leave it undefined so server-side stored ID photo for logged-in user will be used.
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
            medicationAllergy, // NEW
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

            // same UX reset when family added via executeCheckout
            setType("individual");
            setRegistrationType("individual");

            // reset local fields
            setJerseys({ XS: "", S: "", M: "", L: "", XL: "", XXL: "" });
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
                backgroundImage: "url('/images/generalBg.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div className="mx-auto w-full max-w-5xl px-4">
                <h1 className="text-4xl md:text-6xl text-center font-bold mb-8 tracking-wide unified-gradient-title font-moderniz">
                    CIPUTRA COLOR RUN
                </h1>

                <section className="bg-white/95 backdrop-blur-md rounded-lg p-8 md:p-10 shadow-lg text-gray-800" data-aos="zoom-in" data-aos-delay="200">
                    <h2 className="text-2xl font-bold text-center mb-1 text-gray-800 font-moderniz">REGISTRATION FORM</h2>
                    <p className="text-center text-sm text-gray-600 mb-6 font-mustica">Enter the details to get going</p>

                    {/* MOVED: Registration Type radios now on top for easier access */}
                    <div className="space-y-3 mb-6">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">Registration Type <strong className="text-red-500">*</strong></p>
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
                            <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${type === "community" ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105' : 'border-gray-300 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
                                <input type="radio" name="regType" value="community" checked={type === "community"} onChange={() => { setType("community"); setRegistrationType("community"); }} className="sr-only" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${type === "community" ? 'border-emerald-500 bg-emerald-500' : 'border-gray-400 bg-white'}`}>
                                        {type === "community" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`text-sm font-semibold text-center ${type === "community" ? 'text-emerald-700' : 'text-gray-700'}`}>
                                        Community
                                        <span className="block text-xs font-normal">(Min. 10)</span>
                                    </span>
                                </div>
                            </label>

                            {/* Family */}
                            <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${type === "family" ? 'border-purple-500 bg-purple-50 shadow-lg scale-105' : 'border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/50'}`}>
                                <input type="radio" name="regType" value="family" checked={type === "family"} onChange={() => { setType("family"); setRegistrationType("family"); }} className="sr-only" />
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${type === "family" ? 'border-purple-500 bg-purple-500' : 'border-gray-400 bg-white'}`}>
                                        {type === "family" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className={`text-sm font-semibold text-center ${type === "family" ? 'text-purple-700' : 'text-gray-700'}`}>
                                        Family Bundle
                                        <span className="block text-xs font-normal">(4 people)</span>
                                    </span>
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
                                    placeholder="Please list any medical conditions we should be aware of (e.g. Heart Problems, Past Surgeries, Broken Bones, Pregnancy, Stroke, Family History, Congenital Conditions), or write &quot;None&quot; if not applicable"
                                    rows={3}
                                    required
                                />
                            </div>
                        )}

                        {/* Medication Allergy - Only for Individual */}
                        {type === "individual" && (
                            <div className="grid gap-3">
                                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Medication Allergy <strong className="text-red-500">*</strong></label>
                                <textarea
                                    value={medicationAllergy}
                                    onChange={(e) => setMedicationAllergy(e.target.value)}
                                    className="w-full px-4 py-3 border-b-2 border-gray-200 bg-transparent text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors resize-none text-base"
                                    placeholder="List medication allergies (e.g. Penicillin, Aspirin, Ibuprofen), or write 'None' if not applicable"
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
                                            Jersey Size Distribution (4 people total) <strong className ="text-red-500">*</strong>
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
                                        <div className="space-y-2 mb-3">
                                            <span className="text-sm font-semibold text-gray-700 block">Price per person:</span>
                                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                                {discountInfo && (
                                                    <>
                                                        <span className="text-xs sm:text-sm text-gray-400 line-through">
                                                            Rp {discountInfo.basePrice.toLocaleString("id-ID")}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                                                            -{discountInfo.discountPercent}%
                                                        </span>
                                                    </>
                                                )}
                                                <span className="text-base sm:text-lg font-bold text-purple-700 whitespace-nowrap">
                                                    Rp {currentPrice.toLocaleString("id-ID")}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-purple-200">
                                            <div className="space-y-2">
                                                <span className="text-sm font-semibold text-gray-700 block">
                                                    Total Bundle ({selectedCategory?.bundleSize || 4} people):
                                                </span>
                                                <span className="text-lg sm:text-xl font-bold text-purple-800 block text-right">
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
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col terms-modal">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                            <h3 className="text-2xl font-bold text-white text-center">
                                Terms & Conditions
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 text-gray-700 terms-content">
                            <h1 className="text-lg md:text-xl font-extrabold text-gray-900">
                              TERMS AND CONDITIONS FOR PARTICIPANTS OF CIPUTRA COLOR RUN 2026
                            </h1>

                            <p className="text-sm">
                              <strong>By registering as a participant in Ciputra Color Run 2026, the participant fully accepts and agrees to comply with the rules and conditions below.</strong>
                            </p>

                            <h2 className="mt-4 font-bold">SECTION 1: GENERAL EVENT INFORMATION</h2>
                            <ul className="list-disc pl-6 text-sm">
                              <li><strong>Event Name:</strong> Ciputra Color Run 2026</li>
                              <li><strong>Event Date:</strong> April 12, 2026</li>
                              <li><strong>Event Time:</strong> 04:00 - 09:30 WIB</li>
                              <li><strong>Event Location:</strong> Ciputra University Surabaya</li>
                            </ul>

                            <h2 className="mt-4 font-bold">SECTION 2: REGISTRATION & PARTICIPANT CATEGORIES</h2>
                            <ol type="1" className="pl-6 text-sm space-y-2 terms-ol-decimal">
                              <li>
                                <strong>Identification Card Definition:</strong>
                                <ol type="i" className="pl-6 mt-1 space-y-1">
                                  <li>
                                    Identification Card as referred to in these terms and conditions is an official personal identification document issued by an authorized agency and is still valid.
                                  </li>
                                  <li>
                                    Documents that can be used for registration, data verification, and race pack collection include:
                                    {/* Use lettered list specifically for the Adult Indonesian Citizen section */}
                                    <ol type="a" className="pl-6 mt-1 space-y-1 terms-ol-alpha">
                                      <li><strong>Adult Indonesian Citizen:</strong> Kartu Tanda Penduduk (KTP), Surat Izin Mengemudi (SIM), Identitas Kependudukan Digital (IKD), atau kartu pengenal resmi lainnya yang diterbitkan oleh Pemerintah Republik Indonesia.</li>
                                      <li><strong>Child Participant (under 17 years old):</strong> Kartu Identitas Anak (KIA), Akta Kelahiran, Kartu Pelajar, atau dokumen resmi lainnya.</li>
                                      <li><strong>Foreign Citizen (WNA):</strong> Paspor, Kartu Izin Tinggal Terbatas (KITAS), Kartu Izin Tinggal Tetap (KITAP), atau dokumen identitas resmi yang diakui secara internasional.</li>
                                    </ol>
                                  </li>
                                </ol>
                              </li>

                              <li>
                                <strong>Participants:</strong>
                                <ol type="i" className="pl-6 mt-1 space-y-1">
                                  <li>This event is open to the General Public, Indonesian Citizens (WNI), and Foreign Citizens (WNA).</li>
                                  <li>Incorrect data entry that results in discrepancies during verification may lead to registration cancellation.</li>
                                  <li>Participants under the age of 13 must be accompanied by a guardian who is at least 17 years old throughout the entire event, including during race pack collection and while on the event premises. The guardian is fully responsible for the safety, security, and actions of the participant during the event.</li>
                                </ol>
                              </li>
                              <li>
                                <strong>Registration Period: </strong>
                                <ol type="i" className="pl-6 mt-1 space-y-1">
                                  <li> Registration is opened from 1st December until the maximum quota has been fulfilled.</li>
                                </ol>
                              </li>
                              <li>
                                <strong>Registration Platform: </strong>
                                <ol type="i" className="pl-6 mt-1 space-y-1">
                                  <li>Participants can register through the official Ciputra Color Run 2026 website at <a href="https://ciputracolorrun.com" className="text-blue-600 underline">https://ciputracolorrun.com</a>.</li>
                                  <li>Event organizers are not responsible for any consequences resulting from purchases made outside the official platform.</li>
                                </ol>
                              </li>
                              <li>
                                <strong>Categories & Pricing: </strong>
                                <ol type="i" className="pl-6 mt-1 space-y-1">
                                    <li>Registration fee pendaftaran dibagi berdasarkan kategori jarak tempuh sebagai berikut:
                                        <ol type = "a" className="pl-6 mt-1 space-y-1 terms-ol-alpha">
                                            <li>3 KM: Rp 130.000,- (Early Bird) | Rp 150.000,- (Normal Price)</li>
                                            <li>5 KM: Rp 180.000,- (Early Bird) | Rp 200.000,- (Normal Price)</li>
                                            <li>10 KM: Rp 220.000,- (Early Bird) | Rp 250.000,- (Normal Price)</li>
                                        </ol>
                                    </li>
                                </ol>
                              </li>
                              <li>
                                <strong>Registration Status: </strong>
                                 Registration will be declared successful and valid after the participant has made full payment. The organizer will send a confirmation email as proof of ticket purchase.
                              </li>
                              <li>
                                <strong>Data Accuracy: </strong>
                                <ol type="i" className="pl-6 mt-1 space-y-1">
                                    <li>
                                        Participants are required to fill in the registration data with accurate information (name, date of birth, email, and phone number).
                                    </li>
                                    <li>
                                        Errors in data entry that result in the cancellation of results or prizes are entirely the responsibility of the participants.
                                    </li>
                                </ol>
                              </li>
                              <li>
                                <strong>Quota: </strong>
                                The organizer reserves the right to close ticket sales if the quota has been met without prior notice.
                              </li>
                              <li>
                                <strong>Ticket Transfer: </strong>
                                Reselling tickets is prohibited.
                              </li>
                              <li>
                                <strong>Category Changes: </strong>
                                Participants are not allowed to change the distance category.
                              </li>
                            </ol>
                            <h2 className="mt-4 font-bold">SECTION 3: CANCELLATION & REFUND POLICY</h2>
                            <ol type="1" className="pl-6 text-sm space-y-2 terms-ol-decimal">
                              <li>
                                <strong>Final: </strong>
                                Registration that has been successful is final and cannot be canceled.
                                </li>
                                <li>
                                <strong>Non-Refundable: </strong>
                                Registration fees that have been paid are <strong>non-refundable</strong> for any reason, including if the participant does not attend the event.
                              </li>
                              <li>
                                <strong>Force Majeure: </strong>
                                If the event is forcefully canceled due to conditions beyond the organizer's control (such as heavy rain, storms, natural disasters, demonstrations, government policies), the organizer is <strong>not obligated to refund the registration fee.</strong>
                              </li>
                            </ol>
                            <strong>Changes of schedule/location:</strong>
                            If there are changes to the event date or location, purchased tickets remain valid for the new schedule or location. Participants are not entitled to a refund.
                            <h2 className = "mt-4 font-bold">SECTION 4: RACE PACK CLAIM</h2>
                            <ol type="1" className="pl-6 text-sm space-y-2 terms-ol-decimal">
                                <li>
                                    <strong>Race Pack Contents: </strong>
                                    Every registered participant is entitled to a Race Pack, which includes a Running Jersey and a Bib Number. 
                                </li>
                                <li>
                                    <strong>Collection Schedule:</strong>
                                    <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                        <li>
                                            <strong>Date: </strong>9-11 April 2026
                                        </li>
                                        <li>
                                            <strong>Location: </strong>Corepreneur, 1st Floor UC Tower, Universitas Ciputra Surabaya
                                        </li>
                                        <li>
                                             <strong>Operational Hours: </strong>To be announced (TBA)
                                        </li>
                                    </ol>
                                </li>
                                <li>
                                    <strong>Late Collection (Race Day)</strong>
                                    Participants unable to collect during the main schedule are permitted to collect on the event day (April 12, 2026) at the event location, no later than 05:00 WIB.
                                </li>
                                <li>
                                    <strong>Collection Requirements: </strong>
                                    <ol type="a" className="pl-6 mt-1 space-y-1 terms-ol-alpha">
                                        <li>
                                            <strong>Self Collection: </strong>Participants must present the purchase QR Code (print or digital) and a valid Identity Card (ID Card)
                                        </li>
                                        <li>
                                            <strong>Collection via Representative: </strong>
                                            Collection may be delegated provided the Representative (Proxy) brings:
                                            <ol type="i" className="pl-6 mt-1 space-y-1">
                                                <li>The QR Code from the registrant’s account.</li>
                                                <li>A Power of Attorney (Surat Kuasa) signed by the participant (Grantor).</li>
                                                <li>A photocopy of the Participant's ID Card.</li>
                                                <li>The Representative must show their original ID Card, which matches the name on the Power of Attorney</li>
                                            </ol>
                                        </li>
                                    </ol> 
                                </li>
                                <li>
                                    <strong>Jersey Sizes: </strong>
                                    <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                        <li>Jersey sizes are provided according to the selection made during registration.</li>
                                        <li>Size exchanges are not permitted.</li>
                                    </ol>
                                </li>
                                <li>
                                    <strong>Lateness: </strong>
                                    The Organizer is not responsible for a participant's failure to collect the Race Pack outside the scheduled times and provisions.
                                </li>
                            </ol>
                            <h2 className="mt-4 font-bold">SECTION 5: EVENT DAY REGULATIONS</h2>
                            <ol type="1" className="pl-6 text-sm space-y-2 terms-ol-decimal">
                                <li>
                                    <strong>Route: </strong>Participants are required to run on the designated route and comply with safety standards and traffic regulations.
                                </li>
                                <li>
                                    <strong>Prohibited Items on Route: </strong>Participants are prohibited from bringing pets, bicycles, roller skates, skateboards, or other wheeled objects onto the running course.
                                </li>
                                <li>
                                    <strong>Lateness and Cut-Off Time (COT): </strong>Late participants are allowed to start, but no extra time will be given. The Cut-Off Time for completing the run remains absolute according to the schedule.
                                </li>
                                <li>
                                    <strong>Disqualification: </strong>The Organizer reserves the right to disqualify participants who behave inappropriately, disturb others, or fail to comply with established rules.
                                </li>
                                <li>
                                    <strong>Facilities: </strong>Water Stations will be provided at several points along the route.
                                </li>
                                <li>
                                    <strong>Personal Belongings: </strong>Participants may carry personal items (phones, wallets, keys, meds), <strong>but all risks of security, damage, or loss outside the Drop Bag area are the participant's sole responsibility.</strong>
                                </li>
                                <li>
                                    <strong>Cleanliness: </strong>Participants must maintain cleanliness throughout the event area.
                                </li>
                                <li>
                                <li>
                                    <strong>Prizes/Doorprizes: </strong>Prizes are valid only for officially registered participants (committee members are excluded)
                                </li>
                                <li>
                                    <strong>Baggage Deposit Service (Drop Bag): </strong>
                                    <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                        <li>
                                            <strong>Identification Mechanism: </strong>
                                            <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                                <li>
                                                    The organizer will provide baggage services using numbered stickers.
                                                </li>
                                                <li>
                                                    The stickers are matched to the Bib Number of the participants when claiming the baggage back.
                                                </li>
                                            </ol>
                                        </li>
                                        <li>
                                            <strong>Valuables: </strong>
                                            <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                                <li>
                                                    Valuables (phones, wallets, keys, etc.) may be deposited only if placed inside a sealed bag or container before being placed in the box.
                                                </li>
                                                <li>
                                                    Loose, unwrapped items are not accepted .
                                                </li>
                                            </ol>
                                        </li>
                                        <li>
                                            <strong>Prohibited Items: </strong>
                                            The Organizer reserves the right to refuse items that pose a risk or liability, including:
                                            <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                                <li>
                                                    Items with strong odors (e.g. Durian, Items with a strong smell, etc.)
                                                </li>
                                                <li>
                                                    Pets
                                                </li>
                                                <li>
                                                    Sharp objects, weapons, or explosives
                                                </li>
                                                <li>
                                                    Consumables prone to leaking or rotting
                                                </li>
                                            </ol>
                                        </li>
                                        <li>
                                            <strong>Liability Limits: </strong>
                                            <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                                <li>
                                                    The Organizer is responsible only for items officially deposited at the Drop Bag Counter.
                                                </li> 
                                            </ol> 
                                        </li>
                                        <li>
                                            <strong>Unclaimed Items: </strong>
                                            Jika terdapat barang yang tidak diambil hingga acara berakhir, panitia akan melakukan identifikasi pemilik melalui Nomor Bib dan menghubungi peserta melalui nomor WhatsApp yang terdaftar untuk konfirmasi.
                                        </li>
                                        <li>
                                            <strong>Claim Limits: </strong>
                                            Peserta yang telah dikonfirmasi sebagai pemilik barang diberikan batas waktu maksimal 7 (tujuh) hari setelah hari acara untuk mengambil barang tertinggal tersebut di lokasi yang ditentukan.
                                        </li>
                                        <li>
                                            <strong>Unclaimed Items Condition: </strong>
                                            <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                                <li>
                                                    Security guarantees apply only on the event day.
                                                </li>
                                                <li>
                                                    The Organizer is <strong>not liable</strong> for deterioration or damage to items collected after the event day.
                                                </li>
                                            </ol>
                                        </li>
                                    </ol>
                                </li>     
                            </ol>
                            <h2 className="mt-4 font-bold">SECTION 6: HEALTH, SAFETY & LIABILITY WAIVER</h2>
                            <ol type="1" className="pl-6 text-sm space-y-2 terms-ol-decimal">
                                <li>
                                    <strong>Participant Risk: </strong>
                                    By registering, the participant acknowledges that this activity carries risks (including injury, loss, or life-threatening risks).
                                </li>
                                <li>
                                    <strong>Health Condition: </strong>
                                    <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                        <li>
                                            Participants are full responsible for their own health
                                        </li>
                                        <li>
                                            Participants must ensure they are physically fit to participate
                                        </li>
                                    </ol>
                                </li>
                                <li>
                                    <strong>Medical Services: </strong>
                                    <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                        <li>
                                            Basic safety and medical services are provided.
                                        </li>
                                        <li>
                                           Medical staff reserve the right to stop a participant if they are deemed medically unfit to continue.
                                        </li>
                                        <li>
                                            Only generic medications are provided by the organizers
                                        </li>
                                    </ol>
                                </li>
                                <li>
                                    <strong>Liability Waiver: </strong>The organizer is <strong>NOT </strong> responsible for:
                                    <ol type = "a" className = "pl-6 mt-1 space-y-1 terms-ol-alpha">
                                        <li>
                                           Accidents and/or death experienced by participants during the event.
                                        </li>
                                        <li>
                                           Injuries, illnesses, or congenital diseases if the participant failed to declare them in the medical history Google Form.
                                        </li>
                                        <li>
                                           The Organizer is only responsible for first aid for declared conditions.
                                        </li>
                                        <li>
                                            Drug allergies if not declared in the Google Form.
                                        </li>
                                        <li>
                                            Loss or theft of personal belongings.
                                        </li>
                                        <li>
                                            Participant Lateness
                                        </li>
                                    </ol>
                                </li>
                            </ol>
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
