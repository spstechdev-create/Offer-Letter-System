/** Applicability follows faculty identity, independently of editable names/codes. */
export function allowsFtmkMasterTemplate(
  facultyId: string,
  programmeName: string,
  eligibleFacultyId: unknown,
) {
  return (
    typeof eligibleFacultyId === "string" &&
    facultyId === eligibleFacultyId &&
    /(^|\s)(master|sarjana)(\s|$)/i.test(programmeName) &&
    !/philosophy|falsafah|phd|doctor|doktor/i.test(programmeName)
  );
}
