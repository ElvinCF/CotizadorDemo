update dev.empresa
   set logo_principal_url = '/assets/proyectos/arenas-malabrigo/arenas_club_cele.png',
       logo_secundario_url = '/assets/empresas/hola-trujillo/HOLA-TRUJILLO_LOGOTIPO.webp',
       updated_at = now();

update dev.proyectos
   set logo_proyecto_url = '/assets/proyectos/arenas-malabrigo/Logo_Arenas_Malabrigo.svg',
       updated_at = now();

update dev.proyecto_configuracion_ui
   set logo_proyecto_url = '/assets/proyectos/arenas-malabrigo/Logo_Arenas_Malabrigo.svg',
       logo_header_url = '/assets/proyectos/arenas-malabrigo/arenas_club_cele.png',
       logo_footer_url = '/assets/empresas/hola-trujillo/HOLA-TRUJILLO_LOGOTIPO.webp',
       mapa_svg_url = '/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx',
       mapa_webp_url = '/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/plano-fondo-demo-b.webp',
       og_image_url = '/assets/proyectos/arenas-malabrigo/arenas_club_cele.png',
       updated_at = now()
 where estado = true;
