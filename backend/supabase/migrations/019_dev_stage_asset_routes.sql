update dev.proyecto_configuracion_ui ui
   set mapa_svg_url = '/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx',
       mapa_webp_url = '/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/plano-fondo-demo-b.webp',
       updated_at = now()
  from dev.proyectos p
 where ui.proyecto_id = p.id
   and p.slug = 'arenas-malabrigo2';
