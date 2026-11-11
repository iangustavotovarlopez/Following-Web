interface CollaboratorNameParts {
  name: string;
  secondName?: string | null;
  thirdName?: string | null;
  lastname?: string | null;
  secondLastname?: string | null;
  thirdLastname?: string | null;
}

export function collaboratorFullName(item: CollaboratorNameParts) {
  return [
    item.name,
    item.secondName,
    item.thirdName,
    item.lastname,
    item.secondLastname,
    item.thirdLastname,
  ].map((part) => part?.trim()).filter(Boolean).join(' ');
}
