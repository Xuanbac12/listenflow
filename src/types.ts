export type ContentType='vocabulary'|'sentences'|'paragraphs';
export type Content={id:string;title:string;type:ContentType;hint:string;topicId:string;collectionId:string;wordCount:number;updatedAt:number};
export type Group={id:string;name:string;kind:'topic'|'collection'};
export type Settings={ignoreCase:boolean;ignorePunctuation:boolean;dailyGoal:number;theme:'light'|'dark'|'system';timeZone:string};
export type Options=Pick<Settings,'ignoreCase'|'ignorePunctuation'>;
export type Attempt={id:string;contentId:string;title:string;type:ContentType;score:number;answer:string;original:string;createdAt:number;day:string;options:Options;counts:Record<'correct'|'incorrect'|'missing'|'extra',number>;alignment:{status:'correct'|'incorrect'|'missing'|'extra';expected?:string;actual?:string}[]};
export type Stats={attempts:number;average:number;perfect:number;contents:number;mistakes:number;today:string;days:{day:string;attempts:number;scoreSum:number}[]};
export type Mistake={id:string;contentId:string;title:string;type:ContentType;score:number;updatedAt:number};
