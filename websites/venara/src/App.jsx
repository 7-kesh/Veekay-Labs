import {
  CONTACT_EMAIL, LINKEDIN_URL, proof, services, steps, industries,
  founderBio, timeline, credentials, engagements,
} from './content.js';

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 7 L16 26 L27 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="12" r="2.6" fill="var(--accent)" />
    </svg>
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="wrap nav">
        <a className="brand" href="#top" aria-label="Venara Inc home"><Logo /><span>Venara</span></a>
        <nav aria-label="Primary">
          <a href="#services">Services</a>
          <a href="#approach">Approach</a>
          <a href="#founder">Founder</a>
          <a className="btn btn-small" href="#contact">Start a conversation</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="wrap">
        <p className="eyebrow">Product consulting · AI for existing workflows</p>
        <h1>Make the workflows you already run <em>work better</em> — with AI that fits, not AI that disrupts.</h1>
        <p className="lede">Venara helps teams find the bottlenecks in complex operational processes and apply modern infrastructure, AI, and automation where it actually moves the needle — while protecting the flow your users depend on every day.</p>
        <div className="hero-cta">
          <a className="btn" href="#contact">Book a discovery call</a>
          <a className="btn btn-ghost" href="#services">See how we help</a>
        </div>
        <ul className="proof" aria-label="Founder track record">
          {proof.map((p) => <li key={p.label}><strong>{p.value}</strong><span>{p.label}</span></li>)}
        </ul>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="band">
      <div className="wrap split">
        <h2>Most AI projects fail at the workflow, not the model.</h2>
        <div>
          <p>Teams bolt a model onto a process nobody has mapped, then wonder why adoption stalls. The people doing the work route around it, compliance gets nervous, and the pilot never scales.</p>
          <p>Venara starts from the other end: how the work really happens today, where time and accuracy are lost, and which small, well-placed changes will be trusted by the people who use them.</p>
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="section">
      <div className="wrap">
        <p className="eyebrow">Services</p>
        <h2>Where Venara helps</h2>
        <div className="grid cards">
          {services.map((s, i) => (
            <article className="card" key={s.title}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <p className="deliver">You get: {s.deliver}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Approach() {
  return (
    <section id="approach" className="section alt">
      <div className="wrap">
        <p className="eyebrow">Approach</p>
        <h2>Practical, measurable, low-disruption</h2>
        <ol className="steps">
          {steps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}
        </ol>
      </div>
    </section>
  );
}

function Industries() {
  return (
    <section className="section">
      <div className="wrap">
        <p className="eyebrow">Industries</p>
        <h2>Experience across regulated, multi-system environments</h2>
        <div className="grid industries">
          {industries.map((d) => <div key={d.title}><h3>{d.title}</h3><p>{d.body}</p></div>)}
        </div>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section id="founder" className="section alt">
      <div className="wrap founder">
        <div className="founder-intro">
          <p className="eyebrow">Founder</p>
          <h2>Venkat Krishnan Chellappa</h2>
          <p className="role">Founder, Venara Inc · Senior Product Manager</p>
          {founderBio.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          <p className="links"><a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></p>
        </div>
        <div className="founder-detail">
          <h3 className="sub">Selected work <span>(prior roles, not Venara client engagements)</span></h3>
          <ul className="timeline">
            {timeline.map((t) => (
              <li key={t.role}>
                <p className="when">{t.when}</p>
                <h4>{t.role}</h4>
                <p>{t.body}</p>
              </li>
            ))}
          </ul>
          <h3 className="sub">Credentials</h3>
          <ul className="tags">{credentials.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function Engagements() {
  return (
    <section className="section">
      <div className="wrap">
        <p className="eyebrow">Working together</p>
        <h2>Engagements sized to where you are</h2>
        <div className="grid engage">
          {engagements.map((e) => (
            <div className={`engage-card${e.featured ? ' featured' : ''}`} key={e.title}>
              <h3>{e.title}</h3>
              <p className="len">{e.length}</p>
              <p>{e.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="section cta">
      <div className="wrap">
        <h2>Have a workflow that should be working better?</h2>
        <p>Tell me about the process, the people who run it, and what's getting in the way. I'll reply within two business days.</p>
        <a className="btn btn-light" href={`mailto:${CONTACT_EMAIL}?subject=Venara%20discovery%20call`}>Email {CONTACT_EMAIL}</a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap foot">
        <p>© {new Date().getFullYear()} Venara Inc. All rights reserved.</p>
        <p>Milpitas, California</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Problem />
        <Services />
        <Approach />
        <Industries />
        <Founder />
        <Engagements />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
