'use client';

import Link from 'next/link';

interface Props {
  productSlug: string;
  productName: string;
  price: number;
}

export default function BuyButton({ productSlug, productName, price }: Props) {
  const handleAddToCart = () => {
    // 保存到 localStorage 作为简易购物车
    const cart = JSON.parse(localStorage.getItem('yunwu_cart') || '[]');
    cart.push({ slug: productSlug, name: productName, price, quantity: 1 });
    localStorage.setItem('yunwu_cart', JSON.stringify(cart));

    // 跳转到结算页
    window.location.href = '/checkout';
  };

  return (
    <>
      <button 
        onClick={handleAddToCart} 
        className="w-full text-center bg-[var(--yun-ink)] text-[var(--yun-xuan)] py-3 px-6 text-sm font-light tracking-wider rounded-[var(--yun-radius)] hover:bg-[var(--yun-ink)]/90 transition-colors duration-[var(--yun-duration-read)]"
      >
        结缘此物
      </button>
      <Link
        href="/checkout"
        className="block text-center text-xs text-[var(--yun-earth)]/60 hover:text-[var(--yun-earth)] tracking-wider mt-3 transition-colors duration-[var(--yun-duration-read)]"
      >
        查看六会
      </Link>
    </>
  );
}
