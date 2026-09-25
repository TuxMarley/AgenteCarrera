-- Ajusta solo el dato demostrativo de perfil vacío para mantener una denominación consistente.
UPDATE users
SET full_name = 'Perfil de desarrollo'
WHERE id = 'usr_empty_collaborator'
  AND full_name = 'Perfil inicial';
