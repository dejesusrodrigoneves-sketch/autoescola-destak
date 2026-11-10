/**
 * Tela provisoria da fase 0.
 * Existe apenas para provar que o tema (tokens do design.md) esta aplicado.
 * A landing real entra na fase 1, depois da aprovacao de marca (Q-17).
 */
export default function App() {
  return (
    <main className="min-h-dvh bg-rust font-ui text-gold">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-9 px-6 py-20">
        <p className="text-xs uppercase tracking-[0.14em] opacity-80">Autoescola Destak</p>

        <h1 className="font-display text-6xl uppercase leading-[0.82] tracking-[-0.02em] md:text-8xl">
          Fundação
          <br />
          no ar
        </h1>

        <p className="max-w-xl text-lg leading-relaxed">
          Esta tela existe para provar que o tema do <code>design.md</code> está aplicado. Nenhum
          conteúdo de marketing foi escrito aqui.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-gold px-5 py-3 font-display text-sm uppercase tracking-[0.06em] text-clove"
          >
            Botão preenchido
          </button>
          <button
            type="button"
            className="rounded-full border border-gold px-5 py-3 font-display text-sm uppercase tracking-[0.06em] text-gold"
          >
            Botão contorno
          </button>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-spice px-3 py-1 font-display text-[11px] uppercase tracking-[0.12em]">
          fase 0 · fundação
        </span>
      </div>
    </main>
  );
}
