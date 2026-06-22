import { Metadata } from 'next';
import { getSiteSettingValue } from '@/lib/actions/admin-actions';

export const metadata: Metadata = {
  title: '品牌故事｜允物 Yunwu Origin',
  description:
    '允物不是关于产品的品牌，而是关于人与器物关系的品牌。让物归物，让心归心。允许万物成为万物。',
};

export default async function AboutPage() {
  const [brandDesc, brandOrigin, brandNameMeaning] = await Promise.all([
    getSiteSettingValue('brand_description'),
    getSiteSettingValue('brand_origin'),
    getSiteSettingValue('brand_name_meaning'),
  ]);

  const description = brandDesc || '允物是关于人与器物关系的品牌。我们不试图让器物承担本不属于它的责任，希望重新建立一种真实、克制且有温度的人与物的关系。';
  const origin = brandOrigin || '允物创立于东海之滨。创始人多年来沉浸于传统手工艺，从篆刻、大漆、瓷器到珠串，逐渐形成了对器物与人的关系的独特理解。';
  const nameMeaning = brandNameMeaning || '允者，允执厥中。物者，万物有灵，器以载道。允物——允许万物成为万物，也允许自己成为自己。';
  return (
    <>
      <section className="min-h-[45vh] flex items-center justify-center pt-16">
        <div className="text-center max-w-2xl px-6">
          <p className="font-display text-lg text-yun-accent/60 tracking-[0.2em] mb-4">About Yunwu</p>
          <h1 className="text-3xl font-light tracking-[0.15em] mb-6">允物为何存在</h1>
          <div className="divider mb-8" />
          <p className="text-lg text-yun-accent/80 font-light tracking-wider leading-relaxed">
            让物归物，让心归心。
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 pb-24 space-y-20">
        {/* 品牌起源 */}
        <section>
          <h2 className="text-lg font-light tracking-[0.12em] mb-6 pb-3 border-b border-yun-grey/30">品牌起源</h2>
          <div className="text-sm text-yun-text/70 leading-loose space-y-4">
            <p>{origin}</p>
          </div>
        </section>

        {/* 品牌名释义 */}
        <section>
          <h2 className="text-lg font-light tracking-[0.12em] mb-6 pb-3 border-b border-yun-grey/30">品牌名</h2>
          <div className="text-sm text-yun-text/70 leading-loose space-y-4">
            <p>{nameMeaning}</p>
          </div>
        </section>

        {/* 东方器物观 */}
        <section>
          <h2 className="text-lg font-light tracking-[0.12em] mb-6 pb-3 border-b border-yun-grey/30">东方器物观</h2>
          <div className="text-sm text-yun-text/70 leading-loose space-y-4">
            <p>
              允物认为：现代人的很多焦虑，来自于关系失衡。人与物失衡，人与自己失衡，人与世界失衡。
            </p>
            <p>因此允物提出：「人 · 物 · 心」三位一体的器物观。</p>
            <ul className="space-y-3 mt-4">
              <li>
                <span className="text-yun-accent">人</span>：不断成长的主体。真正重要的，始终是使用器物的人。
              </li>
              <li>
                <span className="text-yun-accent">物</span>：承载时间与情感的媒介。器物无需承担改变命运的责任，它的意义是陪伴、记录与见证。
              </li>
              <li>
                <span className="text-yun-accent">心</span>：一切价值的最终归处。允物所做的一切，都是帮助人通过器物重新看见自己的内心。
              </li>
            </ul>
          </div>
        </section>

        {/* 七序世界观 */}
        <section>
          <h2 className="text-lg font-light tracking-[0.12em] mb-6 pb-3 border-b border-yun-grey/30">七序世界观</h2>
          <div className="text-sm text-yun-text/70 leading-loose space-y-4">
            <p>
              允物并不把七序定义为产品分类。七序本质上是七种人生状态。
            </p>
            <p>
              人生并非升级打怪，没有绝对高低，只是不断循环往复。有时我们处于芙初，有时我们处于既明，有时又回到了栖迟。
            </p>
            <p className="text-yun-accent/80">
              因此七序不是等级，不是会员制度，不是价格体系，更不是人生标准答案。它们不是向上的阶梯，而是向内的旅程。你在七序中看到的，其实是不同阶段的自己。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {['芙初', '栖迟', '扶苏', '沧溟', '既明', '观复', '藏真'].map((name, i) => (
                <div key={name} className="border border-yun rounded-brand p-3 text-center">
                  <p className="text-xs text-yun-accent/50">第{i + 1}序</p>
                  <p className="text-sm tracking-wider mt-1">{name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 对材料的理解 */}
        <section>
          <h2 className="text-lg font-light tracking-[0.12em] mb-6 pb-3 border-b border-yun-grey/30">对材料的理解</h2>
          <div className="text-sm text-yun-text/70 leading-loose space-y-4">
            <p>
              每一种材料都有它的来历、性格和故事。水晶是大地亿万年的结晶，沉香是树木受伤后的自我修复，檀木是数十年缓慢生长的年轮。它们不说话，但本身就是时间最诚实的作品。
            </p>
            <p>
              允物选择与天然材质同行，而非制造。我们尊重材料的天然纹理、颜色差异和不完美——因为正是这些差异，让每一件作品成为唯一的陪伴。
            </p>
          </div>
        </section>

        {/* 对时间的理解 */}
        <section>
          <h2 className="text-lg font-light tracking-[0.12em] mb-6 pb-3 border-b border-yun-grey/30">对时间的理解</h2>
          <div className="text-sm text-yun-text/70 leading-loose space-y-4">
            <p>允物信奉长期主义。我们不追求短期爆款，追求十年后依然值得拥有的东西。</p>
            <p>产品会老去，市场会变化，流量会消失。唯有信任会不断累积——这才是允物真正的护城河。</p>
          </div>
        </section>

        {/* 商业伦理 */}
        <section>
          <h2 className="text-lg font-light tracking-[0.12em] mb-6 pb-3 border-b border-yun-grey/30">商业伦理</h2>
          <div className="text-sm text-yun-text/70 leading-loose space-y-4">
            <p className="text-yun-accent/80 font-medium">
              最好的商业，不是让人不断购买，而是让人不断成长。
              最好的品牌，不是让人依赖品牌，而是帮助人建立自己的判断力。
              最好的器物，不是改变命运，而是在人生的重要时刻，安静地陪伴你。
            </p>
            <p>因此我们承诺：不神化器物。不消费焦虑。不欺骗信任。不背离真实。</p>
            <p>在漫长的时间里，持续创造值得被拥有的东西。这就是允物的商业伦理，也是允物存在的底线。</p>
          </div>
        </section>

        {/* 品牌终章 */}
        <section className="text-center pt-10">
          <p className="text-yun-accent/80 text-lg font-light tracking-wider leading-loose">
            愿你拥有器物，但不被器物拥有。
            <br />
            愿你欣赏万物，但不执着于万物。
            <br />
            愿你见天地，见众生，最终见自己。
          </p>
          <div className="divider mt-10" />
          <p className="text-sm text-yun-text/40 mt-6 tracking-wider">
            让物归物，让心归心。允许万物，成为万物。
          </p>
        </section>
      </div>
    </>
  );
}
