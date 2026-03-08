export const serviceConfig: Record<string, { name: string; authority: string; processing: string; apply: string }> = {
  aadhaar: {
    name: "Aadhaar",
    authority: "UIDAI",
    processing: "https://myaadhaar.uidai.gov.in",
    apply: "https://resident.uidai.gov.in"
  },
  pan: {
    name: "PAN Card",
    authority: "Income Tax Department",
    processing: "https://www.incometax.gov.in",
    apply: "https://www.onlineservices.nsdl.com"
  },
  voterid: {
    name: "Voter ID",
    authority: "Election Commission",
    processing: "https://voters.eci.gov.in",
    apply: "https://voters.eci.gov.in"
  },
  airtel: {
    name: "Airtel Payments",
    authority: "Airtel Payments Bank",
    processing: "https://portal.airtelbank.com/RetailerPortal",
    apply: "https://www.airtel.in/bank"
  },
  csc: {
    name: "CSC Portal",
    authority: "CSC e-Governance",
    processing: "https://digitalseva.csc.gov.in",
    apply: "https://register.csc.gov.in"
  },
  sevasindhu: {
    name: "Seva Sindhu",
    authority: "Karnataka Govt",
    processing: "https://sevasindhuservices.karnataka.gov.in",
    apply: "https://sevasindhu.karnataka.gov.in"
  },
  gruhajyothi: {
    name: "Gruha Jyothi",
    authority: "Karnataka Govt",
    processing: "https://sevasindhugs.karnataka.gov.in",
    apply: "https://sevasindhu.karnataka.gov.in"
  },
  gruhalakshmi: {
    name: "Gruha Lakshmi",
    authority: "Karnataka Govt",
    processing: "https://sevasindhugs1.karnataka.gov.in/gl-sp",
    apply: "https://sevasindhu.karnataka.gov.in"
  },
  csctickets: {
    name: "CSC Tickets",
    authority: "CSC Safar",
    processing: "https://cscsafar.in",
    apply: "https://cscsafar.in"
  },
  bhoomi: {
    name: "Bhoomi",
    authority: "Karnataka Land Records",
    processing: "https://landrecords.karnataka.gov.in",
    apply: "https://landrecords.karnataka.gov.in"
  },
  passport: {
    name: "Passport",
    authority: "Passport Seva",
    processing: "https://portal2.passportindia.gov.in",
    apply: "https://passportindia.gov.in"
  },
  swiftmoney: {
    name: "Swift Money",
    authority: "QuickSekure",
    processing: "https://swift.quicksekure.com/Login.aspx",
    apply: "https://swift.quicksekure.com"
  },
  ssp_post: {
    name: "SSP Post Matric",
    authority: "Karnataka Scholarship",
    processing: "https://ssp.postmatric.karnataka.gov.in/homepage.aspx",
    apply: "https://ssp.postmatric.karnataka.gov.in"
  },
  ssp_pre: {
    name: "SSP Pre Matric",
    authority: "Karnataka Scholarship",
    processing: "https://ssp.karnataka.gov.in/ssppre/PreHome",
    apply: "https://ssp.karnataka.gov.in"
  },
  abha: {
    name: "ABHA Card",
    authority: "ABDM",
    processing: "https://abha.abdm.gov.in",
    apply: "https://abha.abdm.gov.in/abha/v3/register"
  },
  ayushman: {
    name: "Ayushman Card",
    authority: "National Health Authority",
    processing: "https://beneficiary.nha.gov.in",
    apply: "https://beneficiary.nha.gov.in"
  },
  ration: {
    name: "Ration Card",
    authority: "Food Dept Karnataka",
    processing: "https://ahara.karnataka.gov.in",
    apply: "https://ahara.karnataka.gov.in"
  },
  ekhata: {
    name: "E-Khata",
    authority: "BBMP",
    processing: "https://bbmpeaasthi.karnataka.gov.in",
    apply: "https://bbmpeaasthi.karnataka.gov.in"
  },
  msme: {
    name: "MSME / UDYAM",
    authority: "Ministry of MSME",
    processing: "https://udyamregistration.gov.in",
    apply: "https://udyamregistration.gov.in"
  },
  incometax: {
    name: "Income Tax",
    authority: "Income Tax Dept",
    processing: "https://www.incometax.gov.in/iec/foportal",
    apply: "https://www.incometax.gov.in"
  },
  kvs: {
    name: "KVS Admission",
    authority: "Kendriya Vidyalaya Sangathan",
    processing: "https://kvsonlineadmission.kvs.gov.in",
    apply: "https://kvsonlineadmission.kvs.gov.in"
  },
  rte: {
    name: "RTE Education",
    authority: "Karnataka Education Dept",
    processing: "https://schooleducation.karnataka.gov.in/en",
    apply: "https://schooleducation.karnataka.gov.in"
  },
  bbmptax: {
    name: "BBMP Tax",
    authority: "BBMP",
    processing: "https://bbmptax.karnataka.gov.in/Default.aspx",
    apply: "https://bbmptax.karnataka.gov.in"
  },
  fssai: {
    name: "Food License",
    authority: "FSSAI",
    processing: "https://foscos.fssai.gov.in",
    apply: "https://foscos.fssai.gov.in"
  },
  sundirect: {
    name: "Sun Direct",
    authority: "Sun Direct",
    processing: "https://www.sundirect.in",
    apply: "https://www.sundirect.in"
  },
  railwaypass: {
    name: "Railway Pass",
    authority: "Indian Railways",
    processing: "https://divyangjanid.indianrail.gov.in",
    apply: "https://divyangjanid.indianrail.gov.in"
  },
  epfo_login: {
    name: "EPFO Login",
    authority: "EPFO",
    processing: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/",
    apply: "https://www.epfindia.gov.in"
  },
  epfo_passbook: {
    name: "EPFO Passbook",
    authority: "EPFO",
    processing: "https://passbook.epfindia.gov.in/MemberPassBook/login",
    apply: "https://passbook.epfindia.gov.in"
  },
  ttd: {
    name: "TTD",
    authority: "Tirumala Tirupati Devasthanams",
    processing: "https://ttdevasthanams.ap.gov.in/home/dashboard",
    apply: "https://ttdevasthanams.ap.gov.in"
  }
};
