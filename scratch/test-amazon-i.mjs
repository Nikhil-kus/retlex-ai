const urls = [
  "https://resizing.flixster.com/-NDyXJG-nH-CsMLq3cnNE4QfvU8=/206x305/v1.bTsxMTYxNTg5NDtqOzE3NzI5OzEyMDA7NzY4OzEwMjQ",
  "https://vintagebookshoppe.com/wp-content/uploads/imported/IMAX-Everest-B000C17F3M.jpg",
  "https://resizing.flixster.com/K1-Jy3Tbb8sT89CrAeo1U1IalyU=/300x300/v2/https://flxt.tmsimg.com/assets/p63551_v_h9_aa.jpg",
  "https://assets2.ignimgs.com/2015/06/04/everestver2xlgjpg-5a450b.jpg",
  "https://m.media-amazon.com/images/S/pv-target-images/6efc2c2453f11390ac096f492deb9607dd7c1608ebc548bbafbb7d68fb72c7b0._UR1920,1080_SX500_FMpng_.png",
  "https://images.static-bluray.com/movies/covers/151101_large.jpg",
  "https://www.mntnfilm.com/img/cache/16078-poster-h-everest-1998-63212-o-.jpg",
  "https://www.mntnfilm.com/img/cache/7523-poster-e-everest-1998-94025-o-.jpg",
  "https://resizing.flixster.com/bFjuZ_ual_kztLIgAQxf8PZmokg=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p14020587_p_v8_aa.jpg",
  "https://prodmanual-imageoptimizat-districtoriginalimagebuc-crt18bxfdhes.s3.amazonaws.com/image/1ca8c8f2-cf6d-442f-854b-c9f127774462.jpg",
  "https://yggdrasille.files.wordpress.com/2015/09/everestmoviex-144292675284pcl.jpg",
  "https://static1.tribute.ca/poster/160x236/everest-imax-10846.jpg",
  "https://parentpreviews.com/images/made/legacy-pics/everest_poster_668_330_80_int_s_c1.jpg",
  "https://bransonimax.com/wp-content/uploads/2024/05/2024-05-06-Posters10.jpg",
  "https://static.tvtropes.org/pmwiki/pub/images/everestold.jpg",
  "https://m.media-amazon.com/images/I/51VS6A5V0NL.jpg"
];

function selectBestImage(urls) {
  for (const url of urls) {
    const lower = url.toLowerCase();
    
    // Check BigBasket
    if (lower.includes('bbassets.com') || lower.includes('bigbasket.com')) {
      return { url, source: 'bigbasket' };
    }
    
    // Check JioMart
    if (lower.includes('jiomart.com') || lower.includes('cdn.fynd.com') || lower.includes('jiomartjcp.com')) {
      return { url, source: 'jiomart' };
    }
    
    // Check Amazon (must be Item image '/images/I/')
    if ((lower.includes('amazon.in') || lower.includes('media-amazon.com') || lower.includes('images-amazon.com')) && lower.includes('/images/i/')) {
      return { url, source: 'amazon' };
    }
    
    // Check Blinkit
    if (lower.includes('blinkit.com') || lower.includes('grofers.com')) {
      return { url, source: 'blinkit' };
    }
    
    // Check Indiamart
    if (lower.includes('imimg.com')) {
      return { url, source: 'indiamart' };
    }
  }
  return null;
}

const best = selectBestImage(urls);
console.log('Best Image:', best);
