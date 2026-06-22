'use client';

import Link from 'next/link';

interface Props {
  productSlug: string;
  productName: string;
  price: number;
}

export default function BuyButton({ productSlug, productName, price }: Props) {
  const handleBuy = () => {
    // 保存到 localStorage 作为简易购物车
    const cart = JSON.parse(localStorage.getItem('yunwu_cart') || '[]');
    cart.push({ slug: productSlug, name: productName, price, quantity: 1 });
    localStorage.setItem('yunwu_cart', JSON.stringify(cart));

    // 跳转到结算页
    window.location.href = '/checkout';
  };

  return (
    <>
      <button onClick={handleBuy} className="btn-primary w-full text-center">
        获取此作品
      </button>
      <Link
        href="/checkout"
        className="block text-center text-xs text-yun-accent/60 hover:text-yun-accent tracking-wider mt-3 transition-colors"
      >
        查看购物袋
      </Link>
    </>
  );
}
