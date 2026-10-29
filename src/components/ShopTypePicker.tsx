'use client';

import { SHOP_TYPES, type ShopType } from '@/lib/shop-types';

export default function ShopTypePicker({ value, onChange, disabled = false }: {
  value: ShopType | ''; onChange: (type: ShopType) => void; disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="mb-4 text-sm font-bold text-neutral-700">Choose your shop category</legend>
      <div className="grid gap-4 sm:grid-cols-3 stagger-children">
        {SHOP_TYPES.map(type => (
          <label 
            key={type.id} 
            className={`
              relative cursor-pointer rounded-3xl border-2 p-5 transition-all duration-300 group
              has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500 has-[:focus-visible]:ring-offset-2
              ${value === type.id 
                ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-lg shadow-emerald-500/20' 
                : 'border-neutral-200 bg-white hover:border-emerald-300 hover:shadow-lg hover:scale-105'
              } 
              ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            <input 
              type="radio" 
              name="shopType" 
              value={type.id} 
              checked={value === type.id} 
              onChange={() => onChange(type.id)} 
              className="absolute right-4 top-4 w-5 h-5 accent-emerald-500" 
              required 
            />
            <span aria-hidden="true" className="block text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">
              {type.icon}
            </span>
            <span className="block font-bold text-neutral-900 text-base">{type.name}</span>
            <span className="block text-xs text-emerald-600 mt-1.5 font-semibold">{type.localName}</span>
            <span className="block text-xs text-neutral-600 mt-2.5 leading-relaxed">{type.description}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-neutral-500 bg-neutral-50 rounded-xl px-4 py-2.5 border border-neutral-200">
        <span className="font-semibold text-neutral-700">Universal items</span>, such as bags, stationery and batteries, are available to every shop.
      </p>
    </fieldset>
  );
}
