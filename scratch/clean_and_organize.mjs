import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
  measurementId: "G-J2Y7R4XMMN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const shopIds = ["PyecarRrYeP4Nx2VqZLd", "Yvgf5Us3pdNGHa0ljBGr"];

function classifyProduct(name, currentCategory) {
  const n = (name || "").toLowerCase().trim();
  const c = (currentCategory || "").toLowerCase().trim();
  
  // 1. Tobacco & Pan
  if (n.includes("tambaku") || n.includes("tobacco") || n.includes("pan ") || n.includes(" pan") || n.includes("supari") || n.includes("gutkha") || n.includes("sigret") || n.includes("cigarette") || n.includes("bidi") || n.includes("khaini") || n.includes("rajnigandha") || n.includes("vimal") || n.includes("pass pass")) {
    return 'Tobacco & Pan';
  }
  
  // 2. Dry Fruits
  if (n.includes("kaju") || n.includes("badaam") || n.includes("badam") || n.includes("pista") || n.includes("kishmish") || n.includes("raisins") || n.includes("cashew") || n.includes("almond") || n.includes("walnut") || n.includes("akhrot") || n.includes("anjeer") || n.includes("makhana") || n.includes("dry fruit") || n.includes("charoli") || n.includes("magaj") || n.includes("chironji") || n.includes("dates") || n.includes("khajur") || n.includes("coconut powder") || n.includes("copra") || n.includes("desiccated coconut")) {
    return 'Dry Fruits';
  }

  // 3. Tea & Coffee
  if (n.includes("tea") || n.includes("coffee") || n.includes("chai") || n.includes("patti") || n.includes("bru ") || n.includes("nescafe") || n.includes("red label") || n.includes("tata tea") || n.includes("wagh bakri") || n.includes("taj mahal") || n.includes("horlicks") || n.includes("bournvita") || n.includes("complan") || n.includes("boost")) {
    return 'Tea & Coffee';
  }

  // 4. Beverages
  if (n.includes("drink") || n.includes("juice") || n.includes("soda") || n.includes("coke") || n.includes("pepsi") || n.includes("fanta") || n.includes("sprite") || n.includes("limca") || n.includes("maaza") || n.includes("frooti") || n.includes("real juice") || n.includes("tang") || n.includes("water") || n.includes("bisleri") || n.includes("aquafina") || n.includes("appy") || n.includes("red bull") || n.includes("sting")) {
    return 'Beverages';
  }

  // 5. Soaps (Make sure it's not a dishwash bar or washing bar)
  if (n.includes("soap") || n.includes("sabun") || n.includes("lux") || n.includes("pears") || n.includes("cinthol") || n.includes("godrej no") || n.includes("medimix") || n.includes("santoor") || n.includes("nirma beauty") || n.includes("savlon soap") || n.includes("jo soap") || n.includes("dettol soap") || n.includes("lifebuoy soap")) {
    if (!n.includes("dishwash") && !n.includes("vim") && !n.includes("rin") && !n.includes("bar") || n.includes("bath") || n.includes("body")) {
      return 'Soaps';
    }
  }

  // 6. Shampoo
  if (n.includes("shampoo") || n.includes("sunsilk") || n.includes("clinic plus") || n.includes("pantene") || n.includes("head & shoulders") || n.includes("dove shampoo") || n.includes("loreal") || n.includes("tresemme") || n.includes("chik")) {
    return 'Shampoo';
  }

  // 7. Oral Care
  if (n.includes("paste") || n.includes("colgate") || n.includes("pepsodent") || n.includes("sensodyne") || n.includes("close up") || n.includes("dant") || n.includes("toothbrush") || n.includes("brush") || n.includes("tongue cleaner") || n.includes("manjan") || n.includes("mouthwash")) {
    return 'Oral Care';
  }

  // 8. Handwash
  if (n.includes("handwash") || n.includes("hand wash") || n.includes("liquid hand")) {
    return 'Handwash';
  }

  // 9. Hair Oil
  if (n.includes("hair oil") || n.includes("amla oil") || n.includes("almond drops") || n.includes("keo karpin") || n.includes("jasmine oil") || n.includes("chameli") || n.includes("navratna")) {
    return 'Hair Oil';
  }

  // 10. Face Creams
  if (n.includes("face cream") || n.includes("fair & lovely") || n.includes("glow & lovely") || n.includes("ponds cream") || n.includes("face wash") || n.includes("facewash") || n.includes("scrub") || n.includes("vicco") || n.includes("roopmantra")) {
    return 'Face Creams';
  }

  // 11. Moisturisers
  if (n.includes("moisturiser") || n.includes("lotion") || n.includes("body lotion") || n.includes("nivea lotion") || n.includes("vaseline") || n.includes("cold cream") || n.includes("body milk")) {
    return 'Moisturisers';
  }

  // 12. Grooming
  if (n.includes("deodorant") || n.includes("deo ") || n.includes("perfume") || n.includes("fogg") || n.includes("wild stone") || n.includes("axe") || n.includes("shaving") || n.includes("gillette") || n.includes("razor") || n.includes("blade") || n.includes("foam") || n.includes("after shave") || n.includes("comb") || n.includes("nail cutter") || n.includes("talcum") || n.includes("pond’s talc") || n.includes("ponds talc") || n.includes("dermi cool") || (n.includes("powder") && (n.includes("ponds") || n.includes("talc")))) {
    return 'Grooming';
  }

  // 13. Oils & Ghee
  if (n.includes(" oil") || n.includes("tel") || n.includes("ghee") || n.includes("mustard") || n.includes("sarso") || n.includes("refined") || n.includes("soyabean") || n.includes("fortune") || n.includes("dhara") || n.includes("sunflower") || n.includes("groundnut") || n.includes("dalda") || n.includes("coconut oil")) {
    return 'Oils & Ghee';
  }

  // 14. Dairy & Milk Products
  if (n.includes("milk") || n.includes("doodh") || n.includes("paneer") || n.includes("curd") || n.includes("dahi") || n.includes("butter") || n.includes("cheese") || n.includes("amul") || n.includes("sanchi") || n.includes("makkhan")) {
    return 'Dairy & Milk Products';
  }

  // 15. Grains & Cereals
  if (n.includes("atta") || n.includes("aata") || n.includes("flour") || n.includes("wheat") || n.includes("gehu") || n.includes("rice") || n.includes("chawal") || n.includes("basmati") || (n.includes("poha") && !n.includes("mixture") && !n.includes("mix")) || n.includes("maida") || n.includes("suji") || n.includes("semolina") || n.includes("sooji") || n.includes("sabudana") || n.includes("dalia") || n.includes("vermicelli") || n.includes("sewai") || n.includes("seviyan") || n.includes("bambino") || n.includes("millet") || n.includes("jowar") || n.includes("bajra") || n.includes("papad")) {
    return 'Grains & Cereals';
  }

  // 16. Pulses & Dals
  if (n.includes("dal") || n.includes("daal") || n.includes("chana") || n.includes("masoor") || n.includes("moong") || n.includes("toor") || n.includes("urad") || n.includes("arhar") || n.includes("kabuli") || n.includes("rajma") || n.includes("besan") || n.includes("lobia") || n.includes("matar") || n.includes("vatana")) {
    return 'Pulses & Dals';
  }

  // 17. Salt & Sugar
  if (n.includes("salt") || n.includes("namak") || n.includes("sugar") || n.includes("shakkar") || n.includes("chini") || n.includes("gud") || n.includes("jaggery") || n.includes("honey") || n.includes("shehad")) {
    return 'Salt & Sugar';
  }

  // 18. Spices & Masala
  if (n.includes("masala") || n.includes("mirch") || n.includes("chilli") || n.includes("haldi") || n.includes("turmeric") || n.includes("dhaniya") || n.includes("coriander") || n.includes("jeera") || n.includes("cumin") || n.includes("hing") || n.includes("asafoetida") || n.includes("ajwain") || n.includes("methi") || n.includes("saunf") || n.includes("fennel") || n.includes("rai") || n.includes("elaichi") || n.includes("clove") || n.includes("laung") || n.includes("dalchini") || n.includes("cinnamon") || n.includes("tejpatta") || n.includes("kasuri methi") || n.includes("sauce") || n.includes("ketchup") || n.includes("pickle") || n.includes("achar") || n.includes("chutney") || n.includes("vinegar") || n.includes("soya sauce") || n.includes("chilli sauce")) {
    return 'Spices & Masala';
  }

  // 19. Instant Foods & Noodles
  if (n.includes("maggi") || n.includes("noodles") || n.includes("yippee") || n.includes("knorr") || n.includes("soup") || n.includes("chings") || n.includes("pasta") || n.includes("macaroni") || n.includes("instant mix") || n.includes("dhokla mix") || n.includes("idli mix") || n.includes("gulab jamun mix") || n.includes("gits") || n.includes("upma") || n.includes("custard") || n.includes("falooda")) {
    return 'Instant Foods & Noodles';
  }

  // 20. Biscuits & Snacks
  if (n.includes("biscuit") || n.includes("cookie") || n.includes("parle") || n.includes("good day") || n.includes("marie") || n.includes("bourbon") || n.includes("hide & seek") || n.includes("tiger cream") || n.includes("krackjack") || n.includes("monaco") || n.includes("snack") || n.includes("namkeen") || n.includes("sev") || n.includes("bhujia") || n.includes("chips") || n.includes("lays") || n.includes("kurkure") || n.includes("bingo") || n.includes("puff") || n.includes("popcorn") || n.includes("ponga") || n.includes("fryums")) {
    return 'Biscuits & Snacks';
  }

  // 21. Confectionery
  if (n.includes("chocolate") || n.includes("dairy milk") || n.includes("kitkat") || n.includes("five star") || n.includes("5 star") || n.includes("perk") || n.includes("munch") || n.includes("snickers") || n.includes("milkybar") || n.includes("cadbury") || n.includes("candy") || n.includes("toffee") || n.includes("pulse candy") || n.includes("center fresh") || n.includes("gum") || n.includes("lollypop") || n.includes("sweet")) {
    return 'Confectionery';
  }

  // 22. Soaps
  if (n.includes(" soap") || n.includes("soap ")) {
    return 'Soaps';
  }

  // 23. Household Cleaning
  if (n.includes("harpic") || n.includes("cleaner") || n.includes("phenyl") || n.includes("lizol") || n.includes("colin") || n.includes("toilet clean") || n.includes("floor clean") || n.includes("glass clean") || n.includes("vim liquid") || n.includes("dishwash") || n.includes("scrub pad") || n.includes("steel scrub") || n.includes("nip mahabar") || n.includes("nip bar") || n.includes("vim bar") || n.includes("easy wash")) {
    return 'Household Cleaning';
  }

  // 24. Laundry
  if ((n.includes("wash") && (n.includes("powder") || n.includes("liquid") || n.includes("bar"))) || n.includes("surf excel") || n.includes("rin") || n.includes("wheel") || n.includes("ghadi") || n.includes("tide") || n.includes("ariel") || n.includes("detergent") || n.includes("comfort") || n.includes("ujala")) {
    return 'Laundry';
  }

  // 25. Pooja Items
  if (n.includes("puja") || n.includes("pooja") || n.includes("camphor") || n.includes("kapoor") || n.includes("chandan") || n.includes("kumkum") || n.includes("roli") || n.includes("diya") || n.includes("batti") || n.includes("cotton wicks") || n.includes("genga jal") || n.includes("loban") || n.includes("guggal") || n.includes("agarbatti") || n.includes("dhoop")) {
    return 'Pooja Items';
  }

  // 26. Household Essentials
  if (n.includes("matchbox") || n.includes("match box") || n.includes("foil") || n.includes("tissue") || n.includes("carry bag") || n.includes("poly bag") || n.includes("all out") || n.includes("good night") || n.includes("mosquito") || n.includes("repellent") || n.includes("hit spray") || n.includes("coil") || n.includes("bulb") || n.includes("battery") || n.includes("rat trap") || n.includes("pesticide") || n.includes("air freshener") || n.includes("odonil")) {
    return 'Household Essentials';
  }

  // ── Fallbacks: check current category ──
  if (c.includes("tobacco") || c.includes("pan")) return 'Tobacco & Pan';
  if (c.includes("dry fruit")) return 'Dry Fruits';
  if (c.includes("tea & coffee")) return 'Tea & Coffee';
  if (c.includes("beverage")) return 'Beverages';
  if (c === "soaps") return 'Soaps';
  if (c === "shampoo") return 'Shampoo';
  if (c.includes("oral")) return 'Oral Care';
  if (c === "handwash") return 'Handwash';
  if (c.includes("hair oil")) return 'Hair Oil';
  if (c === "face creams") return 'Face Creams';
  if (c === "moisturisers") return 'Moisturisers';
  if (c === "grooming" || c === "powder") return 'Grooming';
  if (c.includes("oil") || c.includes("ghee")) return 'Oils & Ghee';
  if (c.includes("dairy")) return 'Dairy & Milk Products';
  if (c.includes("grain") || c.includes("cereal") || c.includes("flour") || c.includes("staple")) return 'Grains & Cereals';
  if (c.includes("pulse") || c.includes("dal") || c.includes("protein")) return 'Pulses & Dals';
  if (c.includes("salt") || c.includes("sugar")) return 'Salt & Sugar';
  if (c.includes("spice") || c.includes("masala") || c.includes("pickle") || c.includes("sauce")) return 'Spices & Masala';
  if (c.includes("instant food") || c.includes("instant mix")) return 'Instant Foods & Noodles';
  if (c.includes("biscuit") || c.includes("snack") || c.includes("namkeen")) return 'Biscuits & Snacks';
  if (c.includes("confectionery") || c.includes("sweet")) return 'Confectionery';
  if (c.includes("cleaning") || c.includes("cleaner")) return 'Household Cleaning';
  if (c.includes("laundry")) return 'Laundry';
  if (c.includes("pooja")) return 'Pooja Items';
  if (c.includes("household") || c.includes("pesticide") || c.includes("packaging")) return 'Household Essentials';
  if (c.includes("personal") || c.includes("hygiene") || c.includes("beauty") || c.includes("baby")) return 'Personal Care';
  if (c.includes("household") || c.includes("clean")) return 'Household Essentials';

  return 'Uncategorized';
}

async function runCleanup() {
  for (const shopId of shopIds) {
    console.log(`\n======================================`);
    console.log(`RUNNING CLEANUP FOR SHOP ID: ${shopId}`);
    console.log(`======================================`);
    
    const q = query(collection(db, "products"), where("shopId", "==", shopId));
    const querySnapshot = await getDocs(q);
    
    let updateCount = 0;
    const catStats = {};
    
    for (const d of querySnapshot.docs) {
      const data = d.data();
      const newCat = classifyProduct(data.name, data.category);
      
      catStats[newCat] = (catStats[newCat] || 0) + 1;
      
      if (data.category !== newCat) {
        const productRef = doc(db, "products", d.id);
        await updateDoc(productRef, { category: newCat });
        updateCount++;
      }
    }
    
    console.log(`Cleaned up ${updateCount} products.`);
    console.log("New Category Distribution:", catStats);
  }
  console.log("Migration finished successfully!");
  process.exit(0);
}

runCleanup().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
