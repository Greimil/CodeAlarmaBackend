import {
  AIprocessReq
} from "./quality.services";
import type { EventEvaluated } from "@/types";


export const getFilteredEventsController = async (req : any , res: any) => {
  
  try{
    let events: EventEvaluated[]  = req.filteredEvents
    
    let result =  await AIprocessReq(events)
    



    
    
    return res.json(result);
  }catch(err){


    throw err


  }

  


 



};
