import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center"
         style={{ backgroundColor: '#F5F1EA' }}>
      {/* 留白呼吸 */}
      <div className="max-w-md mx-auto">
        {/* 序号 */}
        <p className="font-serif text-6xl md:text-8xl tracking-widest mb-8"
           style={{ color: '#D9CCB8' }}>
          无
        </p>

        {/* 标题 */}
        <h1 className="text-2xl md:text-3xl font-serif mb-4"
            style={{ color: '#2B2B2B' }}>
          此页无物
        </h1>

        {/* 描述 */}
        <p className="text-base leading-relaxed mb-12"
           style={{ color: '#8A6A44' }}>
          老子曰：有之以为利，无之以为用。
          <br />
          您寻找的页面或许尚未存在，或许已归于无。
        </p>

        {/* 返回按钮 */}
        <Link
          href="/"
          className="inline-block px-8 py-3 border text-sm tracking-wider
                     transition-all duration-500 hover:bg-current"
          style={{
            borderColor: '#2B2B2B',
            color: '#2B2B2B',
          }}
        >
          归 去
        </Link>
      </div>
    </div>
  );
}
