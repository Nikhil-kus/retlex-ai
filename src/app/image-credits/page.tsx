import credits from '../../../public/catalog-images/credits.json';

export default function ImageCreditsPage() {
  return <main className="h-dvh w-full overflow-y-auto bg-slate-50 p-6">
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">Catalog photo credits</h1>
      <p className="mt-3 text-sm text-slate-600">Product photos from Wikimedia Commons. Images have been resized and converted to JPEG for display. Each image retains the license linked below. Photos are representative; brands and models may vary.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Object.entries(credits).map(([filename, credit]) => <article key={filename} className="rounded-xl bg-white border border-slate-200 p-4 flex gap-4">
          {/* External photo credits are retained alongside every downloaded image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/catalog-images/${filename}`} alt={filename.replace(/\.jpg$/, '').replaceAll('-', ' ')} width={80} height={80} className="h-20 w-20 object-contain" />
          <div className="text-xs break-words min-w-0">
            <a href={credit.sourceUrl} className="font-semibold text-indigo-700 underline">{credit.title.replace('File:', '')}</a>
            <p className="mt-2 text-slate-600">{credit.author}</p>
            <a href={credit.licenseUrl} className="mt-2 block text-indigo-700 underline">{credit.license}</a>
          </div>
        </article>)}
      </div>
    </div>
  </main>;
}
