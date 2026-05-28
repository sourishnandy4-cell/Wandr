import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, CheckSquare, Plus, Trash2, ClipboardList, Briefcase,
  Ticket, Hotel, Sparkles, FilePlus, Check, Upload, Eye,
  Download, FileImage, X, AlertTriangle, FolderOpen, Phone,
  ShieldAlert, Ambulance, Flame,
} from 'lucide-react';

// ── Emergency contacts per country ───────────────────────────────────────────
const EMERGENCY_CONTACTS = {
  IN: {
    label: '🇮🇳 India',
    lines: [
      { icon: '🚔', label: 'Police',               number: '100'           },
      { icon: '🚑', label: 'Ambulance',             number: '102'           },
      { icon: '🔥', label: 'Fire',                  number: '101'           },
      { icon: '🆘', label: 'All Emergencies',       number: '112'           },
      { icon: '👩', label: "Women's Helpline",      number: '1091'          },
      { icon: '✈️', label: 'Tourist Helpline',       number: '1800-111-363'  },
      { icon: '🏥', label: 'Medical Helpline',       number: '104'           },
    ],
  },
  US: {
    label: '🇺🇸 United States',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '911'           },
      { icon: '🚔', label: 'Non-Emergency Police',  number: '311'           },
      { icon: '☠️', label: 'Poison Control',         number: '1-800-222-1222'},
      { icon: '🧠', label: 'Mental Health / Crisis', number: '988'           },
      { icon: '✈️', label: 'Travel State Dept',      number: '1-888-407-4747'},
    ],
  },
  EU: {
    label: '🇪🇺 Europe (Schengen)',
    lines: [
      { icon: '🆘', label: 'Pan-EU Emergency',      number: '112'           },
      { icon: '🚔', label: 'Police (DE)',            number: '110'           },
      { icon: '🚔', label: 'Police (FR)',            number: '17'            },
      { icon: '🚔', label: 'Police (ES/IT)',         number: '112'           },
      { icon: '🚑', label: 'Medical (FR)',           number: '15'            },
      { icon: '🚑', label: 'Medical (IT)',           number: '118'           },
      { icon: '🔥', label: 'Fire (DE)',              number: '112'           },
    ],
  },
  UK: {
    label: '🇬🇧 United Kingdom',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '999'           },
      { icon: '🚔', label: 'Non-Emergency Police',  number: '101'           },
      { icon: '🏥', label: 'NHS Non-Emergency',     number: '111'           },
      { icon: '🧠', label: 'Samaritans (crisis)',   number: '116 123'       },
      { icon: '✈️', label: 'FCO Travel Advice',     number: '020 7008 5000' },
    ],
  },
  JP: {
    label: '🇯🇵 Japan',
    lines: [
      { icon: '🚔', label: 'Police',                number: '110'           },
      { icon: '🚑', label: 'Ambulance & Fire',       number: '119'           },
      { icon: '✈️', label: 'Tourist Hotline (24h)',  number: '050-3816-2787' },
      { icon: '🆘', label: 'Japan Helpline (EN)',    number: '0120-461-997'  },
      { icon: '🏥', label: 'Medical (Tokyo)',        number: '03-5285-8181'  },
    ],
  },
  AU: {
    label: '🇦🇺 Australia',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '000'           },
      { icon: '🚔', label: 'Police (non-emergency)',number: '131 444'       },
      { icon: '🏥', label: 'Health Direct',         number: '1800 022 222'  },
      { icon: '🧠', label: 'Lifeline (crisis)',     number: '13 11 14'      },
    ],
  },
  SG: {
    label: '🇸🇬 Singapore',
    lines: [
      { icon: '🚔', label: 'Police',                number: '999'           },
      { icon: '🚑', label: 'Ambulance & Fire',       number: '995'           },
      { icon: '🏥', label: 'Non-Emergency Ambulance',number: '1777'         },
      { icon: '✈️', label: 'Tourist Hotline',        number: '1800-736-2000' },
    ],
  },
  TH: {
    label: '🇹🇭 Thailand',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '191'           },
      { icon: '🚑', label: 'Ambulance',             number: '1669'          },
      { icon: '🔥', label: 'Fire',                  number: '199'           },
      { icon: '✈️', label: 'Tourist Police',         number: '1155'          },
    ],
  },
  AE: {
    label: '🇦🇪 UAE / Dubai',
    lines: [
      { icon: '🚔', label: 'Police',                number: '999'           },
      { icon: '🚑', label: 'Ambulance',             number: '998'           },
      { icon: '🔥', label: 'Fire',                  number: '997'           },
      { icon: '✈️', label: 'Tourism (Dubai)',        number: '800-DXB (392)' },
    ],
  },
  FR: {
    label: '🇫🇷 France',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'Police',                number: '17'            },
      { icon: '🚑', label: 'SAMU (Medical)',        number: '15'            },
      { icon: '🔥', label: 'Fire (Pompiers)',       number: '18'            },
      { icon: '🏥', label: 'Medical Helpline',      number: '3114'          },
    ],
  },
  DE: {
    label: '🇩🇪 Germany',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'Police',                number: '110'           },
      { icon: '🚑', label: 'Ambulance',             number: '112'           },
      { icon: '🏥', label: 'Medical Advice',        number: '116 117'       },
    ],
  },
  IT: {
    label: '🇮🇹 Italy',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'Carabinieri (Police)',  number: '112'           },
      { icon: '🚑', label: 'Ambulance',             number: '118'           },
      { icon: '🔥', label: 'Fire',                  number: '115'           },
    ],
  },
  ES: {
    label: '🇪🇸 Spain',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'Police (Nacional)',     number: '091'           },
      { icon: '🚑', label: 'Ambulance',             number: '061'           },
      { icon: '🔥', label: 'Fire',                  number: '080'           },
    ],
  },
  CN: {
    label: '🇨🇳 China',
    lines: [
      { icon: '🚔', label: 'Police',                number: '110'           },
      { icon: '🚑', label: 'Ambulance',             number: '120'           },
      { icon: '🔥', label: 'Fire',                  number: '119'           },
      { icon: '✈️', label: 'Tourist Complaint',     number: '12301'         },
    ],
  },
  KR: {
    label: '🇰🇷 South Korea',
    lines: [
      { icon: '🚔', label: 'Police',                number: '112'           },
      { icon: '🚑', label: 'Ambulance & Fire',       number: '119'           },
      { icon: '✈️', label: 'Tourist Helpline (EN)',  number: '1330'          },
      { icon: '🏥', label: 'Medical Interpreter',   number: '02-2072-0505'  },
    ],
  },
  MX: {
    label: '🇲🇽 Mexico',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '911'           },
      { icon: '✈️', label: 'Tourist Assistance',    number: '078'           },
      { icon: '🚑', label: 'Cruz Roja (Ambulance)', number: '065'           },
    ],
  },
  BR: {
    label: '🇧🇷 Brazil',
    lines: [
      { icon: '🚔', label: 'Police (Military)',     number: '190'           },
      { icon: '🚑', label: 'SAMU (Ambulance)',      number: '192'           },
      { icon: '🔥', label: 'Fire',                  number: '193'           },
      { icon: '🆘', label: 'Civil Defense',         number: '199'           },
    ],
  },
  GR: {
    label: '🇬🇷 Greece',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'Police',                number: '100'           },
      { icon: '🚑', label: 'Ambulance (EKAB)',      number: '166'           },
      { icon: '🔥', label: 'Fire',                  number: '199'           },
      { icon: '⛵', label: 'Coast Guard',           number: '108'           },
      { icon: '✈️', label: 'Tourist Police',        number: '171'           },
    ],
  },
  PT: {
    label: '🇵🇹 Portugal',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'PSP Police',            number: '112'           },
      { icon: '🚑', label: 'Ambulance (INEM)',      number: '112'           },
      { icon: '🔥', label: 'Fire',                  number: '112'           },
      { icon: '✈️', label: 'SEF (Immigration)',     number: '808 202 653'   },
    ],
  },
  NL: {
    label: '🇳🇱 Netherlands',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'Police (non-emergency)',number: '0900-8844'     },
      { icon: '🏥', label: 'GP / Medical Advice',  number: '0900-1010'     },
    ],
  },
  CH: {
    label: '🇨🇭 Switzerland',
    lines: [
      { icon: '🚔', label: 'Police',                number: '117'           },
      { icon: '🚑', label: 'Ambulance',             number: '144'           },
      { icon: '🔥', label: 'Fire',                  number: '118'           },
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🏔️', label: 'Mountain Rescue (REGA)',number: '1414'          },
    ],
  },
  TR: {
    label: '🇹🇷 Turkey',
    lines: [
      { icon: '🚔', label: 'Police',                number: '155'           },
      { icon: '🚑', label: 'Ambulance',             number: '112'           },
      { icon: '🔥', label: 'Fire',                  number: '110'           },
      { icon: '🏥', label: 'Emergency',             number: '112'           },
      { icon: '✈️', label: 'Tourist Police',        number: '527'           },
    ],
  },
  HR: {
    label: '🇭🇷 Croatia',
    lines: [
      { icon: '🆘', label: 'All Emergencies (EU)',  number: '112'           },
      { icon: '🚔', label: 'Police',                number: '192'           },
      { icon: '🚑', label: 'Ambulance',             number: '194'           },
      { icon: '🔥', label: 'Fire',                  number: '193'           },
    ],
  },
  ID: {
    label: '🇮🇩 Indonesia / Bali',
    lines: [
      { icon: '🚔', label: 'Police',                number: '110'           },
      { icon: '🚑', label: 'Ambulance',             number: '118'           },
      { icon: '🔥', label: 'Fire',                  number: '113'           },
      { icon: '🆘', label: 'National Emergency',    number: '112'           },
      { icon: '✈️', label: 'Tourist (Bali)',         number: '0361-224111'   },
    ],
  },
  MY: {
    label: '🇲🇾 Malaysia',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '999'           },
      { icon: '🚑', label: 'Ambulance',             number: '999'           },
      { icon: '✈️', label: 'Tourist Hotline',       number: '1300-88-5050'  },
    ],
  },
  PH: {
    label: '🇵🇭 Philippines',
    lines: [
      { icon: '🆘', label: 'National Emergency',    number: '911'           },
      { icon: '🚔', label: 'PNP Police',            number: '117'           },
      { icon: '✈️', label: 'DOT Tourist Hotline',   number: '1800-10-867-5347'},
    ],
  },
  VN: {
    label: '🇻🇳 Vietnam',
    lines: [
      { icon: '🚔', label: 'Police',                number: '113'           },
      { icon: '🚑', label: 'Ambulance',             number: '115'           },
      { icon: '🔥', label: 'Fire',                  number: '114'           },
      { icon: '✈️', label: 'Tourist Hotline',       number: '1800-599-920'  },
    ],
  },
  NP: {
    label: '🇳🇵 Nepal',
    lines: [
      { icon: '🚔', label: 'Police',                number: '100'           },
      { icon: '🚑', label: 'Ambulance',             number: '102'           },
      { icon: '🔥', label: 'Fire',                  number: '101'           },
      { icon: '✈️', label: 'Tourist Police',        number: '01-4247041'    },
    ],
  },
  ZA: {
    label: '🇿🇦 South Africa',
    lines: [
      { icon: '🚔', label: 'Police (SAPS)',         number: '10111'         },
      { icon: '🚑', label: 'Ambulance',             number: '10177'         },
      { icon: '🆘', label: 'All Emergencies',       number: '112'           },
    ],
  },
  EG: {
    label: '🇪🇬 Egypt',
    lines: [
      { icon: '🚔', label: 'Police',                number: '122'           },
      { icon: '🚑', label: 'Ambulance',             number: '123'           },
      { icon: '🔥', label: 'Fire',                  number: '180'           },
      { icon: '✈️', label: 'Tourist Police',        number: '126'           },
    ],
  },
  MA: {
    label: '🇲🇦 Morocco',
    lines: [
      { icon: '🚔', label: 'Police',                number: '190'           },
      { icon: '🚑', label: 'Ambulance (SAMU)',      number: '150'           },
      { icon: '🔥', label: 'Fire',                  number: '15'            },
      { icon: '👮', label: 'Gendarmerie',           number: '177'           },
    ],
  },
  AR: {
    label: '🇦🇷 Argentina',
    lines: [
      { icon: '🚔', label: 'Police',                number: '101'           },
      { icon: '🚑', label: 'Ambulance (SAME)',      number: '107'           },
      { icon: '🔥', label: 'Fire',                  number: '100'           },
      { icon: '🆘', label: 'Emergency',             number: '911'           },
    ],
  },
  CL: {
    label: '🇨🇱 Chile',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '133'           },
      { icon: '🚔', label: 'Carabineros (Police)',  number: '133'           },
      { icon: '🚑', label: 'Ambulance (SAMU)',      number: '131'           },
      { icon: '🔥', label: 'Fire',                  number: '132'           },
    ],
  },
  PE: {
    label: '🇵🇪 Peru',
    lines: [
      { icon: '🚔', label: 'Police',                number: '105'           },
      { icon: '🚑', label: 'Ambulance (SAMU)',      number: '106'           },
      { icon: '🔥', label: 'Fire',                  number: '116'           },
      { icon: '✈️', label: 'Tourist Police (iPeru)',number: '574-8000'      },
    ],
  },
  CA: {
    label: '🇨🇦 Canada',
    lines: [
      { icon: '🆘', label: 'All Emergencies',       number: '911'           },
      { icon: '🚔', label: 'Non-Emergency (RCMP)',  number: '310-6060'      },
      { icon: '☠️', label: 'Poison Control',        number: '1-800-268-9017'},
    ],
  },
};

// ── Destination → region code mapper ─────────────────────────────────────────
const DESTINATION_MAP = [
  // Japan
  { keys: ['japan','tokyo','osaka','kyoto','hiroshima','nagoya','sapporo','fukuoka','okinawa','nara','shibuya','shinjuku','akihabara'], code: 'JP' },
  // USA
  { keys: ['usa','united states','america','new york','los angeles','san francisco','chicago','miami','las vegas','hawaii','california','texas','boston','seattle','washington dc'], code: 'US' },
  // Canada
  { keys: ['canada','toronto','vancouver','montreal','calgary','ottawa','quebec'], code: 'CA' },
  // UK
  { keys: ['uk','united kingdom','england','britain','london','manchester','edinburgh','scotland','wales','birmingham','liverpool'], code: 'UK' },
  // Australia
  { keys: ['australia','sydney','melbourne','brisbane','perth','adelaide','cairns','gold coast'], code: 'AU' },
  // Singapore
  { keys: ['singapore'], code: 'SG' },
  // Thailand
  { keys: ['thailand','bangkok','phuket','chiang mai','koh samui','pattaya','chiang rai'], code: 'TH' },
  // UAE
  { keys: ['uae','dubai','abu dhabi','united arab emirates','sharjah','ajman'], code: 'AE' },
  // France
  { keys: ['france','paris','lyon','marseille','nice','bordeaux','strasbourg','toulouse'], code: 'FR' },
  // Germany
  { keys: ['germany','berlin','munich','hamburg','frankfurt','cologne','stuttgart','düsseldorf'], code: 'DE' },
  // Italy
  { keys: ['italy','rome','milan','venice','florence','naples','sicily','turin','amalfi','positano'], code: 'IT' },
  // Spain
  { keys: ['spain','madrid','barcelona','seville','valencia','malaga','ibiza','granada','bilbao'], code: 'ES' },
  // Greece  ← dedicated entry, no longer falls to EU generic
  { keys: ['greece','athens','thessaloniki','larissa','patras','heraklion','rhodes','mykonos','santorini','corfu','crete','zakynthos','meteora','delphi','olympia','sparta'], code: 'GR' },
  // Croatia
  { keys: ['croatia','dubrovnik','split','zagreb','hvar','pula','zadar'], code: 'HR' },
  // Portugal
  { keys: ['portugal','lisbon','porto','algarve','madeira','azores','faro','coimbra'], code: 'PT' },
  // Netherlands
  { keys: ['netherlands','amsterdam','rotterdam','the hague','utrecht','eindhoven','holland'], code: 'NL' },
  // Switzerland
  { keys: ['switzerland','zurich','geneva','basel','bern','lausanne','interlaken','lucerne','zermatt'], code: 'CH' },
  // Turkey
  { keys: ['turkey','istanbul','ankara','antalya','cappadocia','izmir','bodrum','ephesus','pamukkale'], code: 'TR' },
  // China
  { keys: ['china','beijing','shanghai','guangzhou','shenzhen','chengdu','hong kong','macau','xian'], code: 'CN' },
  // South Korea
  { keys: ['south korea','korea','seoul','busan','jeju','incheon','gyeongju'], code: 'KR' },
  // Indonesia / Bali
  { keys: ['indonesia','bali','jakarta','yogyakarta','lombok','komodo','ubud','seminyak'], code: 'ID' },
  // Malaysia
  { keys: ['malaysia','kuala lumpur','penang','langkawi','kota kinabalu','malacca'], code: 'MY' },
  // Vietnam
  { keys: ['vietnam','hanoi','ho chi minh','hoi an','da nang','ha long','nha trang','hue'], code: 'VN' },
  // Philippines
  { keys: ['philippines','manila','cebu','palawan','boracay','davao','bohol'], code: 'PH' },
  // Nepal
  { keys: ['nepal','kathmandu','pokhara','everest','chitwan','lumbini','bhaktapur'], code: 'NP' },
  // India
  { keys: ['india','mumbai','delhi','bangalore','chennai','kolkata','hyderabad','jaipur','goa','kerala','agra','varanasi','pune'], code: 'IN' },
  // Mexico
  { keys: ['mexico','cancun','mexico city','guadalajara','playa del carmen','tulum','oaxaca','cabo'], code: 'MX' },
  // Brazil
  { keys: ['brazil','rio de janeiro','sao paulo','salvador','fortaleza','recife','manaus','florianopolis'], code: 'BR' },
  // Argentina
  { keys: ['argentina','buenos aires','mendoza','bariloche','córdoba','ushuaia','patagonia'], code: 'AR' },
  // Chile
  { keys: ['chile','santiago','valparaiso','torres del paine','atacama','easter island'], code: 'CL' },
  // Peru
  { keys: ['peru','lima','cusco','machu picchu','arequipa','lake titicaca','nazca'], code: 'PE' },
  // South Africa
  { keys: ['south africa','cape town','johannesburg','durban','kruger','soweto','pretoria'], code: 'ZA' },
  // Egypt
  { keys: ['egypt','cairo','luxor','aswan','hurghada','sharm el sheikh','alexandria','giza'], code: 'EG' },
  // Morocco
  { keys: ['morocco','marrakech','casablanca','fez','rabat','agadir','tangier','sahara'], code: 'MA' },
  // Europe generic fallback (Austria, Belgium, Scandinavia, Balkans etc.)
  { keys: ['europe','schengen','austria','vienna','belgium','brussels','sweden','stockholm','norway','oslo','denmark','copenhagen','finland','helsinki','poland','warsaw','czech','prague','hungary','budapest','romania','bucharest','slovakia','slovenia','estonia','latvia','lithuania','luxembourg','malta','cyprus'], code: 'EU' },
];

// Returns region code from a destination string, falling back to user's region
const detectRegionFromDestination = (destination, userRegion = 'IN') => {
  if (!destination) return userRegion;
  const lower = destination.toLowerCase();
  for (const entry of DESTINATION_MAP) {
    if (entry.keys.some(k => lower.includes(k))) return entry.code;
  }
  return userRegion;
};

const MAX_DOCS = 3;
const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

// ── Compress image to base64 ──────────────────────────────────────────────────
const compressImage = (file, maxPx = 1200, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Read failed'));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Image decode failed'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          const scale = maxPx / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// ── Read file as base64 (for PDFs) ────────────────────────────────────────────
const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Read failed'));
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });

export const TravelDocs = ({ tripId, currentUser, tripDestination }) => {
  const region = detectRegionFromDestination(tripDestination, currentUser?.region || 'IN');
  const emergency = EMERGENCY_CONTACTS[region] || EMERGENCY_CONTACTS.IN;

  const [activeSection, setActiveSection] = useState('notes');
  const [notes, setNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('general');

  const [packingItems, setPackingItems] = useState([]);
  const [newPackingText, setNewPackingText] = useState('');
  const [newPackingCategory, setNewPackingCategory] = useState('Essentials');
  const packingCategories = ['Essentials', 'Clothing', 'Electronics', 'Toiletries', 'Others'];

  // ── Saved document files (up to 3) ──────────────────────────────────────────
  const [savedDocs, setSavedDocs] = useState([]);
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null); // { name, data, type }
  const fileInputRef = useRef(null);

  // ── Load from localStorage ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tripId) return;

    const savedNotes = localStorage.getItem(`wandr_notes_${tripId}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      setNotes([
        {
          id: 'note-2',
          title: 'Flight Booking Reference',
          content: 'Airline: Iberia (IB3014)\nConfirmation Code: Z8Y8XP\nDeparting: 10:45 AM',
          category: 'ticket',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        },
      ]);
    }

    const savedPacking = localStorage.getItem(`wandr_packing_${tripId}`);
    if (savedPacking) {
      setPackingItems(JSON.parse(savedPacking));
    } else {
      setPackingItems([
        { id: 'p-1', text: 'Passport and Visa documents',          category: 'Essentials',  checked: true  },
        { id: 'p-2', text: 'Physical plane tickets / Boarding passes', category: 'Essentials', checked: false },
        { id: 'p-3', text: 'Universal power adapter',              category: 'Electronics', checked: false },
        { id: 'p-4', text: 'Noise-canceling headphones',           category: 'Electronics', checked: true  },
        { id: 'p-5', text: 'Comfortable walking sneakers',         category: 'Clothing',    checked: false },
        { id: 'p-6', text: 'Toothbrush and travel-sized toothpaste', category: 'Toiletries', checked: false },
      ]);
    }

    try {
      const rawDocs = localStorage.getItem(`wandr_docs_${tripId}`);
      if (rawDocs) setSavedDocs(JSON.parse(rawDocs));
    } catch (_) { setSavedDocs([]); }
  }, [tripId]);

  const saveNotes = (u) => { setNotes(u); localStorage.setItem(`wandr_notes_${tripId}`, JSON.stringify(u)); };
  const savePacking = (u) => { setPackingItems(u); localStorage.setItem(`wandr_packing_${tripId}`, JSON.stringify(u)); };
  const persistDocs = (u) => { setSavedDocs(u); localStorage.setItem(`wandr_docs_${tripId}`, JSON.stringify(u)); };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    saveNotes([{ id: 'note-' + Date.now(), title: newNoteTitle.trim(), content: newNoteContent.trim(), category: newNoteCategory, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }, ...notes]);
    setNewNoteTitle(''); setNewNoteContent(''); setNewNoteCategory('general');
  };

  const handleAddPacking = (e) => {
    e.preventDefault();
    if (!newPackingText.trim()) return;
    savePacking([...packingItems, { id: 'p-' + Date.now(), text: newPackingText.trim(), category: newPackingCategory, checked: false }]);
    setNewPackingText('');
  };

  // ── Document upload handler ──────────────────────────────────────────────────
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setDocError('');

    if (savedDocs.length >= MAX_DOCS) {
      setDocError(`You can save up to ${MAX_DOCS} documents. Delete one first.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setDocError(`File too large (max 3 MB). Please compress it first.`);
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPDF   = file.type === 'application/pdf';
    if (!isImage && !isPDF) {
      setDocError('Only images (JPG, PNG, WEBP) and PDF files are supported.');
      return;
    }

    setDocUploading(true);
    try {
      const data = isImage ? await compressImage(file) : await readAsBase64(file);
      const doc = {
        id:   'doc-' + Date.now(),
        name: file.name,
        type: isImage ? 'image' : 'pdf',
        mime: file.type,
        data,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        size: (file.size / 1024).toFixed(0) + ' KB',
      };
      persistDocs([...savedDocs, doc]);
    } catch (err) {
      setDocError('Failed to process file: ' + err.message);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = (id) => {
    if (!window.confirm('Remove this saved document?')) return;
    persistDocs(savedDocs.filter(d => d.id !== id));
    if (previewDoc?.id === id) setPreviewDoc(null);
  };

  const handleDownloadDoc = (doc) => {
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.name;
    a.click();
  };

  const getCategoryIcon = (category) => {
    if (category === 'ticket') return <Ticket className="w-4 h-4 text-accent" />;
    if (category === 'accommodation') return <Hotel className="w-4 h-4 text-emerald-500" />;
    return <FileText className="w-4 h-4 text-primary/60" />;
  };

  const tabs = [
    { id: 'notes',   label: 'Trip Notes & Tickets',   icon: FileText      },
    { id: 'packing', label: 'Packing Checklist',       icon: ClipboardList },
    { id: 'files',   label: 'Saved Documents',         icon: FolderOpen    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 p-6 md:p-8 space-y-6 animate-fadeIn font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 text-accent text-xs font-bold rounded-full">
            <Sparkles className="w-3 h-3" /> Trip Docs & Essentials
          </div>
          <h2 className="text-2xl font-extrabold text-primary tracking-tight">Travel Documents</h2>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                activeSection === id ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary hover:bg-slate-100'
              }`}>
              <Icon className="w-3.5 h-3.5" /><span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: TRIP NOTES & TICKETS
          ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'notes' && (
        <div className="space-y-6">

          {/* ── Region Emergency Contacts Card ── */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-red-100/70 pb-3">
              <div className="p-1.5 bg-red-100 rounded-lg"><ShieldAlert className="w-4 h-4 text-red-500" /></div>
              <div>
                <h3 className="font-extrabold text-sm text-red-700">Emergency Contacts — {emergency.label}</h3>
                <p className="text-[10px] text-red-400 font-medium">Auto-populated based on your trip destination</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {emergency.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/70 border border-red-100/50 rounded-xl px-3 py-2.5">
                  <span className="text-lg leading-none flex-shrink-0">{line.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{line.label}</p>
                    <p className="text-sm font-extrabold text-red-600 font-mono tracking-wide">{line.number}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-red-400 font-medium pl-1">
              ℹ️ Numbers match your trip destination. Change destination in Trip Settings to update.
            </p>
          </div>

          {/* ── Notes grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 shadow-inner">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
                <FilePlus className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-primary text-sm">Add Quick Note / Doc</h3>
              </div>
              <form onSubmit={handleAddNote} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Title *</label>
                  <input type="text" required value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)}
                    placeholder="e.g. Hotel Check-in Details"
                    className="w-full text-xs rounded-xl border-gray-200 px-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
                  <select value={newNoteCategory} onChange={e => setNewNoteCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border-gray-200 px-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all">
                    <option value="general">General Notes / Contacts</option>
                    <option value="ticket">Flights & Tickets</option>
                    <option value="accommodation">Accommodation & Bookings</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Content *</label>
                  <textarea required rows="4" value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)}
                    placeholder="Paste ticket references, addresses, or booking codes here..."
                    className="w-full text-xs rounded-xl border-gray-200 px-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all font-sans resize-none" />
                </div>
                <button type="submit"
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 hover:shadow transition-all duration-200">
                  <Plus className="w-3.5 h-3.5" /> Save Note
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-gray-200 rounded-2xl text-center space-y-2">
                  <FileText className="w-10 h-10 text-gray-300" />
                  <h4 className="font-bold text-sm text-primary">No Notes Added Yet</h4>
                  <p className="text-xs text-gray-400 max-w-xs">Store confirmation numbers, boarding details, and key addresses here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map(note => (
                    <div key={note.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative group">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg">{getCategoryIcon(note.category)}</div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{note.category}</span>
                          </div>
                          <button onClick={() => saveNotes(notes.filter(n => n.id !== note.id))}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-extrabold text-sm text-primary tracking-tight">{note.title}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line font-medium">{note.content}</p>
                      </div>
                      <div className="border-t border-gray-50 pt-2.5 mt-3">
                        <span className="text-[10px] text-gray-400 font-bold">{note.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PACKING CHECKLIST
          ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'packing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 shadow-inner">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
              <Briefcase className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-primary text-sm">Add Packing Item</h3>
            </div>
            <form onSubmit={handleAddPacking} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item Description *</label>
                <input type="text" required value={newPackingText} onChange={e => setNewPackingText(e.target.value)}
                  placeholder="e.g. Toiletries travel bag"
                  className="w-full text-xs rounded-xl border-gray-200 px-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
                <select value={newPackingCategory} onChange={e => setNewPackingCategory(e.target.value)}
                  className="w-full text-xs rounded-xl border-gray-200 px-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all">
                  {packingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button type="submit"
                className="w-full bg-[#E8A87C] hover:bg-[#d8976b] text-white font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 hover:shadow transition-all duration-200">
                <Plus className="w-3.5 h-3.5" /> Add to Checklist
              </button>
            </form>
            <div className="bg-white border border-gray-100 rounded-xl p-3 text-center space-y-1.5">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Checklist Progress</span>
              <div className="text-xl font-black text-primary">{packingItems.filter(i => i.checked).length} / {packingItems.length}</div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-accent h-full transition-all duration-300"
                  style={{ width: `${packingItems.length ? (packingItems.filter(i => i.checked).length / packingItems.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {packingCategories.map(category => {
              const items = packingItems.filter(i => i.category === category);
              if (!items.length) return null;
              return (
                <div key={category} className="space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{category}</h4>
                  <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden shadow-sm">
                    {items.map(item => (
                      <div key={item.id}
                        className={`flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group select-none ${item.checked ? 'bg-slate-50/50' : ''}`}>
                        <div onClick={() => savePacking(packingItems.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))}
                          className="flex items-center gap-3 flex-1 cursor-pointer">
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-accent border-accent text-white' : 'border-gray-300 group-hover:border-accent'}`}>
                            {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-semibold transition-all ${item.checked ? 'text-gray-400 line-through font-normal' : 'text-primary'}`}>{item.text}</span>
                        </div>
                        <button onClick={() => savePacking(packingItems.filter(i => i.id !== item.id))}
                          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {packingItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-gray-200 rounded-2xl text-center space-y-2">
                <CheckSquare className="w-10 h-10 text-gray-300" />
                <h4 className="font-bold text-sm text-primary">Packing List is Empty</h4>
                <p className="text-xs text-gray-400 max-w-xs">Organize clothing, electronics, and essentials so you never forget anything.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: SAVED DOCUMENTS (up to 3 images or PDFs)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'files' && (
        <div className="space-y-5 animate-fadeIn">

          {/* Info bar */}
          <div className="flex items-start justify-between gap-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold text-blue-700">Document Vault</p>
              <p className="text-[11px] text-blue-500 leading-relaxed">
                Save up to <strong>{MAX_DOCS}</strong> important documents — passport scan, visa, hotel voucher — as JPG, PNG, or PDF.
                Files are stored privately in your browser only.
              </p>
            </div>
            <span className={`flex-shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full ${savedDocs.length >= MAX_DOCS ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {savedDocs.length}/{MAX_DOCS}
            </span>
          </div>

          {/* Error */}
          {docError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />{docError}
              <button onClick={() => setDocError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Upload button */}
          {savedDocs.length < MAX_DOCS && (
            <label className={`flex items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${docUploading ? 'border-accent/40 bg-accent/5' : 'border-gray-200 hover:border-accent/50 hover:bg-accent/5'}`}>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleDocUpload} className="hidden" disabled={docUploading} />
              {docUploading ? (
                <div className="flex items-center gap-2 text-accent text-sm font-bold">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Processing…
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Upload className="w-6 h-6 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-gray-500">Click to upload a document</p>
                  <p className="text-[11px] text-gray-400">JPG · PNG · WEBP · PDF &nbsp;·&nbsp; Max 3 MB</p>
                </div>
              )}
            </label>
          )}

          {/* Document cards */}
          {savedDocs.length === 0 && !docUploading ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-2xl text-center space-y-2">
              <FolderOpen className="w-10 h-10 text-gray-300" />
              <h4 className="font-bold text-sm text-primary">No Saved Documents Yet</h4>
              <p className="text-xs text-gray-400 max-w-xs">Upload your passport scan, visa copy, or hotel voucher for quick offline access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDocs.map(doc => (
                <div key={doc.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
                  {/* Thumbnail */}
                  <div className="h-40 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                    {doc.type === 'image' ? (
                      <img src={doc.data} alt={doc.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-red-50 rounded-2xl"><FileText className="w-8 h-8 text-red-400" /></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PDF</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button onClick={() => setPreviewDoc(doc)}
                        className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors" title="Preview">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDownloadDoc(doc)}
                        className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteDoc(doc.id)}
                        className="p-2.5 bg-red-500/70 hover:bg-red-500 rounded-xl text-white transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Meta */}
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-extrabold text-primary truncate" title={doc.name}>{doc.name}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                        {doc.type === 'pdf' ? '📄 PDF' : '🖼️ Image'}
                      </span>
                      <span className="text-[10px] text-gray-400">{doc.size} · {doc.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center">🔒 Files are stored in your browser only and never uploaded to any server.</p>
        </div>
      )}

      {/* ── Full-screen preview modal ── */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-primary text-white px-4 py-3 rounded-t-2xl">
              <p className="text-sm font-bold truncate">{previewDoc.name}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleDownloadDoc(previewDoc)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => setPreviewDoc(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-slate-900 rounded-b-2xl overflow-auto flex-1 flex items-center justify-center p-4" style={{ maxHeight: '80vh' }}>
              {previewDoc.type === 'image' ? (
                <img src={previewDoc.data} alt={previewDoc.name} className="max-w-full max-h-full object-contain rounded-xl" />
              ) : (
                <div className="text-center space-y-4 text-white">
                  <div className="p-6 bg-white/10 rounded-2xl inline-block"><FileText className="w-16 h-16 text-white/60" /></div>
                  <p className="text-sm font-bold">{previewDoc.name}</p>
                  <p className="text-xs text-white/50">PDF preview not supported in browser.<br />Click Download to open it.</p>
                  <button onClick={() => handleDownloadDoc(previewDoc)}
                    className="flex items-center gap-2 bg-accent text-white font-bold rounded-xl px-5 py-2.5 text-sm mx-auto hover:bg-accent/90 transition-colors">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
