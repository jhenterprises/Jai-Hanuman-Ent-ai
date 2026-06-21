import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

const servicesList = [
      { name: "Aadhaar", description: "Aadhaar Services", icon: "Fingerprint" },
      { name: "Airtel Payments", description: "Airtel Payments Bank", icon: "CreditCard" },
      { name: "Ayushman Bharat Health Account", description: "Ayushman Bharat Health Account", icon: "HeartPulse" },
      { name: "Ayushman Card", description: "PMJAY Beneficiary Portal", icon: "Activity" },
      { name: "BBMP Tax", description: "BBMP Property Tax", icon: "Building" },
      { name: "Bhoomi Land Records", description: "Karnataka Land Records, Pani, RTC,Stech", icon: "Map" },
      { name: "CSC Portal", description: "Digital Seva Portal", icon: "Globe" },
      { name: "CSC Tickets", description: "CSC Safar Tickets", icon: "Ticket" },
      { name: "E Shram Card", description: "E Shram Card Ministry of Labour & Employment", icon: "Briefcase" },
      { name: "E-Khata", description: "BBMP E-Khata", icon: "FileText" },
      { name: "EPFO Member Login", description: "EPFO Member Portal", icon: "Users" },
      { name: "EPFO Member Passbook", description: "EPFO Passbook Portal", icon: "Book" },
      { name: "Food License", description: "FSSAI Food License", icon: "ShoppingBag" },
      { name: "Gruha Jyothi", description: "Gruha Jyothi Scheme", icon: "Lightbulb" },
      { name: "Gruha Lakshmi", description: "Gruha Lakshmi Scheme", icon: "Home" },
      { name: "HSRP Number Plate", description: "Book My HSRP Plate", icon: "Car" },
      { name: "Income Tax", description: "Income Tax E-Filing", icon: "Landmark" },
      { name: "KMDC Loans", description: "kmdc Online karnataka", icon: "Banknote" },
      { name: "KVS Admission", description: "Kendriya Vidyalaya Admission", icon: "School" },
      { name: "MSME / UDYAM", description: "Udyam Registration", icon: "Briefcase" },
      { name: "NPIC Mapping", description: "NPIC Mapping", icon: "MapPin" },
      { name: "PAN Card", description: "PAN Card Services", icon: "CreditCard" },
      { name: "Passport", description: "Passport Seva", icon: "Plane" },
      { name: "Pseva Kendra", description: "P Seva Kendra", icon: "Store" },
      { name: "Railway Pass", description: "Divyangjan Railway ID", icon: "Train" },
      { name: "Ration Card", description: "Karnataka Ration Card", icon: "CreditCard" },
      { name: "RTE Education", description: "Right to Education Karnataka", icon: "BookOpen" },
      { name: "RTO Services", description: "RTO Services New LL,DL (2 & 4 Wheeler)", icon: "Car" },
      { name: "Seva Sindhu", description: "Karnataka Seva Sindhu", icon: "Globe" },
      { name: "Soul Pay", description: "Money Transfer, Recharge, Bill Payments, Phone pe or G Pay", icon: "Smartphone" },
      { name: "SSP Post Matric", description: "Post Matric Scholarship", icon: "GraduationCap" },
      { name: "SSP Pre Matric", description: "Pre Matric Scholarship", icon: "GraduationCap" },
      { name: "Sun Direct", description: "Sun Direct Portal", icon: "Tv" },
      { name: "Swift Money", description: "Swift Money Portal", icon: "DollarSign" },
      { name: "TTD Tirupati", description: "TTD Darshan Booking", icon: "Ticket" },
      { name: "UDID CARD", description: "Swavlamban card", icon: "CreditCard" },
      { name: "Voter ID", description: "Voter ID Services", icon: "UserCheck" }
];

export const seedServicesToFirestore = async () => {
    try {
        const snap = await getDocs(collection(db, 'services'));
        if (!snap.empty) {
            console.log("Services already exist. Seed skipped.");
            return;
        }

        console.log("Seeding services...");
        for (let i = 0; i < servicesList.length; i++) {
            const service = servicesList[i];
            await addDoc(collection(db, 'services'), {
                service_id: service.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
                name: service.name,
                description: service.description,
                icon: service.icon,
                application_type: 'external',
                category: 'All Services',
                status: 'active',
                enabled: true,
                is_visible: true,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                order: i
            });
        }
        console.log("Seeding complete!");
        window.location.reload();
    } catch (e) {
        console.error("Error seeding services:", e);
    }
}
