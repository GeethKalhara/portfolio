import portrait from "../assets/geeth-portrait.png";
import NeuralVortex from "../components/nurelvertex";

function Hero() {
    return (
        <section className="hero">
            <NeuralVortex
                quality={0.75}
                speed={0.32}
                interactive={true}
                colorA={[0.12, 0.28, 0.52]}
                colorB={[0.48, 0.12, 0.28]}
                tint={[0.08, 0.02, 0.12]}
            />

            <div className="leftcontent">
                <p className="availability">● Available for work</p>
                <h2>Designer<br />Developer</h2>
            </div>

            <div className="rightcontent">
                <p>Hi, I'm Geeth kalhara — a UI/UX and brand designer passionate about creating seamless digital experiences and meaningful brand identities.</p>
                <a href="#projects" className="hero-cta">
                    <span>●</span>
                    See my work
                </a>
            </div>

            

            <h1 className="hero-name">Geeth Kalhara</h1>
           
        </section>
    )
}

export default Hero