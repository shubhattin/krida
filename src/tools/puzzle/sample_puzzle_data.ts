type sample_data_type = {
  grid_data: string[][];
  grid_dimensions: [number, number];
  word_list: string[];
  word_list_occurences: number[];
};

export const SAMPLE_DATA: sample_data_type[] = [];

const SAMPLE_WORD_LIST_1 = {
  गङ्गा: 1,
  गोदावरी: 2,
  यमुना: 1,
  नर्मदा: 1,
  कृष्णा: 1,
  भीमा: 1,
  ब्रह्मपुत्रा: 1,
  कावेरी: 1,
  तुङ्गभद्रा: 1,
  अलकनन्दा: 1,
  भागीरथी: 1
};
SAMPLE_DATA.push({
  word_list: Object.keys(SAMPLE_WORD_LIST_1),
  word_list_occurences: Object.values(SAMPLE_WORD_LIST_1),
  grid_data: [
    ['र', 'थी', 'गो', 'तु', 'री', 'वे'],
    ['गी', 'ग', 'दा', 'व', 'ङ्ग', 'का'],
    ['भा', 'ङ्गा', 'री', 'भ', 'ल', 'क'],
    ['ष्णा', 'त्रा', 'द्रा', 'अ', 'न्दा', 'न'],
    ['कृ', 'दा', 'पु', 'ह्म', 'ब्र', 'भी'],
    ['न', 'र्म', 'य', 'मु', 'ना', 'मा']
  ],
  grid_dimensions: [6, 6]
});
