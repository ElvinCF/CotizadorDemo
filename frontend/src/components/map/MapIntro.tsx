import { projectInfo } from "../../data/projectInfo";

function MapIntro() {
  return (
    <section className="map-intro">
      <div className="map-intro__title">
        <div>
          <span className="intro-kicker">Proyecto inmobiliario</span>
          <div className="project-title">
            <a
              href="https://holatrujillo.com/condominio-ecologico-arenas-malabrigo/"
              target="_blank"
              rel="noreferrer"
              className="project-logo-link"
            >
              <img
                src="/assets/Logo_Arenas_Malabrigo.svg"
                alt={projectInfo.name}
                className="project-logo"
              />
            </a>
            <div>
              <h3>{projectInfo.stage}</h3>
              <p className="intro-sub">
                Lotes listos para invertir o vivir. Servicios instalados y seguridad permanente.
              </p>
            </div>
          </div>
        </div>
        <div className="intro-owner">
          <span>Propietario</span>
          <a href="https://www.holatrujillo.com/" target="_blank" rel="noreferrer">
            <img src="/assets/HOLA-TRUJILLO_LOGOTIPO.webp" alt={projectInfo.owner} />
          </a>
          <a
            className="btn ghost instagram"
            href="https://www.instagram.com/arenasmalabrigo/"
            target="_blank"
            rel="noreferrer"
          >
            ?? Instagram
          </a>
        </div>
      </div>

      <div className="map-intro__split">
        <div className="map-intro__summary">
          <div className="intro-location">
            <h4>Ubicacion</h4>
            <ul>
              <li>Predio: {projectInfo.location.predio}</li>
              <li>Distrito: {projectInfo.location.distrito}</li>
              <li>Provincia: {projectInfo.location.provincia}</li>
              <li>Departamento: {projectInfo.location.departamento}</li>
            </ul>
          </div>
          <div className="intro-amenities">
            <h4>Beneficios del proyecto</h4>
            <ul>
              {projectInfo.amenities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="map-intro__cards">
          <div className="map-intro__panel-title">Razones para elegir tu lote</div>
          <div className="map-intro__grid">
            {projectInfo.salesHighlights.map((card) => (
              <article key={card.title}>
                <h4>{card.title}</h4>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MapIntro;
