/*
  # Добавление политики вставки для таблицы character
  
  1. Новые политики
     - Добавление политики INSERT для таблицы character 
     - Разрешение пользователям создавать свои персонажи
  
  2. Безопасность
     - Политика ограничивает вставку записей только для своих персонажей (id = uid())
*/

-- Добавляем политику INSERT для таблицы character
CREATE POLICY "Characters are insertable by owners or admins"
  ON public."character"
  FOR INSERT
  TO public
  WITH CHECK ((id = auth.uid()) OR is_admin());

-- Комментарий к политике для документации
COMMENT ON POLICY "Characters are insertable by owners or admins" ON public."character" IS
'Разрешает пользователям создавать свои персонажи или администраторам создавать любые персонажи';